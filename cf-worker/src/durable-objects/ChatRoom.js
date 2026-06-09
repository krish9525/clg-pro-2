import { DurableObject } from "cloudflare:workers";
import mongoose from "mongoose";
import ChatModel, { formatChatMessage } from "../models/Chat.js";
import { connectDb } from "../db.js";

const populateFields = [
  { path: "sender", select: "name email role" },
  { path: "receiver", select: "name email role" },
  { path: "reactions.userId", select: "name" },
];

export class ChatRoom extends DurableObject {
  constructor(state, env) {
    super(state, env);
    // userId (string) → WebSocket
    this.userSockets = new Map();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      await connectDb(this.env);

      switch (data.type) {
        case "join":
          this.userSockets.set(String(data.userId), ws);
          ws._userId = String(data.userId);
          break;

        case "sendMessage":
          await this._handleSendMessage(data);
          break;

        case "chat:react":
          await this._handleReact(data);
          break;

        case "typing": {
          const receiverWs = this.userSockets.get(String(data.receiver));
          if (receiverWs) {
            receiverWs.send(
              JSON.stringify({ type: "typing", sender: data.sender, senderName: data.senderName })
            );
          }
          break;
        }

        case "stopTyping": {
          const receiverWs = this.userSockets.get(String(data.receiver));
          if (receiverWs) {
            receiverWs.send(JSON.stringify({ type: "stopTyping", sender: data.sender }));
          }
          break;
        }
      }
    } catch (err) {
      try {
        ws.send(JSON.stringify({ type: "chat:error", message: err.message }));
      } catch {}
    }
  }

  async webSocketClose(ws) {
    for (const [userId, socket] of this.userSockets) {
      if (socket === ws) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }

  _emit(senderId, receiverId, type, payload) {
    const msg = JSON.stringify({ type, ...payload });
    const senderWs = this.userSockets.get(String(senderId));
    const receiverWs = this.userSockets.get(String(receiverId));

    const sent = new Set();
    if (senderWs) { senderWs.send(msg); sent.add(senderWs); }
    if (receiverWs && !sent.has(receiverWs)) receiverWs.send(msg);
  }

  async _handleSendMessage(data) {
    const { sender, receiver, message = "", messageType = "text", imageUrl = "" } = data;
    const text = (message || "").trim();
    if (!text && !imageUrl) return;

    const chat = await ChatModel.create({
      sender, receiver,
      message: text,
      messageType: imageUrl ? "image" : messageType,
      imageUrl: imageUrl || "",
    });

    const populated = await chat.populate([
      { path: "sender", select: "name email role" },
      { path: "receiver", select: "name email role" },
    ]);

    this._emit(sender, receiver, "chat:message", { message: formatChatMessage(populated) });
  }

  async _handleReact(data) {
    const { messageId, emoji, userId } = data;
    if (!messageId || !emoji || !userId) return;

    const chat = await ChatModel.findById(messageId);
    if (!chat) return;

    const uid = String(userId);
    const idx = chat.reactions.findIndex((r) => r.userId.toString() === uid);

    if (idx >= 0) {
      if (chat.reactions[idx].emoji === emoji) {
        chat.reactions.splice(idx, 1);
      } else {
        chat.reactions[idx].emoji = emoji;
      }
    } else {
      chat.reactions.push({ emoji, userId });
    }

    await chat.save();

    const populated = await ChatModel.findById(messageId).populate(populateFields);
    this._emit(chat.sender, chat.receiver, "chat:reaction", {
      message: formatChatMessage(populated),
    });
  }
}
