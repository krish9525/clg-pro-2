import Chat, { formatChatMessage } from "../models/Chat.js";

const populateFields = [
  { path: "sender", select: "name email role" },
  { path: "receiver", select: "name email role" },
  { path: "reactions.userId", select: "name" },
];

const emitToUsers = (io, userSocketMap, senderId, receiverId, event, payload) => {
  const senderSocketId = userSocketMap.get(String(senderId));
  const receiverSocketId = userSocketMap.get(String(receiverId));

  const targets = new Set();
  if (senderSocketId) targets.add(senderSocketId);
  if (receiverSocketId) targets.add(receiverSocketId);

  targets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
};

export const registerChatSocket = (io, userSocketMap) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
      userSocketMap.set(String(userId), socket.id);
      socket.userId = String(userId);
      console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    socket.on("sendMessage", async (data) => {
      try {
        const {
          sender,
          receiver,
          message = "",
          messageType = "text",
          imageUrl = "",
        } = data;

        const text = (message || "").trim();
        if (!text && !imageUrl) return;

        const chat = await Chat.create({
          sender,
          receiver,
          message: text,
          messageType: imageUrl ? "image" : messageType,
          imageUrl: imageUrl || "",
        });

        const populated = await chat.populate(populateFields);
        const payload = formatChatMessage(populated);

        emitToUsers(
          io,
          userSocketMap,
          sender,
          receiver,
          "chat:message",
          payload
        );
      } catch (error) {
        console.error("sendMessage error:", error.message);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:react", async ({ messageId, emoji, userId }) => {
      try {
        if (!messageId || !emoji || !userId) return;

        const chat = await Chat.findById(messageId);
        if (!chat) return;

        const uid = String(userId);
        const existingIndex = chat.reactions.findIndex(
          (r) => r.userId.toString() === uid
        );

        if (existingIndex >= 0) {
          if (chat.reactions[existingIndex].emoji === emoji) {
            chat.reactions.splice(existingIndex, 1);
          } else {
            chat.reactions[existingIndex].emoji = emoji;
          }
        } else {
          chat.reactions.push({ emoji, userId });
        }

        await chat.save();
        const populated = await Chat.findById(messageId).populate(populateFields);
        const payload = formatChatMessage(populated);

        emitToUsers(
          io,
          userSocketMap,
          chat.sender,
          chat.receiver,
          "chat:reaction",
          payload
        );
      } catch (error) {
        console.error("chat:react error:", error.message);
      }
    });

    socket.on("typing", (data) => {
      const { sender, receiver } = data;
      const receiverSocketId = userSocketMap.get(String(receiver));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { sender, senderName: data.senderName });
      }
    });

    socket.on("stopTyping", (data) => {
      const { sender, receiver } = data;
      const receiverSocketId = userSocketMap.get(String(receiver));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { sender });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      for (const [userId, socketId] of userSocketMap) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });
};
