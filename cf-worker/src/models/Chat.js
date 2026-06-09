import _mongoose from "../db.js";

const reactionSchema = new _mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: { type: _mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const chatSchema = new _mongoose.Schema(
  {
    sender: { type: _mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: _mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, default: "" },
    messageType: { type: String, enum: ["text", "image"], default: "text" },
    imageUrl: { type: String, default: "" },
    reactions: [reactionSchema],
  },
  { timestamps: true }
);

export const formatChatMessage = (doc) => ({
  _id: doc._id,
  sender: { _id: doc.sender._id, name: doc.sender.name },
  receiver: { _id: doc.receiver._id, name: doc.receiver.name },
  message: doc.message || "",
  messageType: doc.messageType || "text",
  imageUrl: doc.imageUrl || "",
  reactions: (doc.reactions || []).map((r) => ({
    emoji: r.emoji,
    userId: r.userId?._id ? r.userId._id.toString() : r.userId.toString(),
    userName: r.userId?.name || "",
  })),
  createdAt: doc.createdAt,
});

let ChatModel;
try { ChatModel = _mongoose.model("Chat", chatSchema); }
catch { ChatModel = _mongoose.model("Chat"); }
export default ChatModel;
