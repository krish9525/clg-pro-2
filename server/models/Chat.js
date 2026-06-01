import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, default: "" },
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    imageUrl: { type: String, default: "" },
    reactions: [reactionSchema],
  },
  { timestamps: true }
);

export const formatChatMessage = (doc) => {
  const sender = doc.sender;
  const receiver = doc.receiver;

  return {
    _id: doc._id,
    sender: {
      _id: sender._id,
      name: sender.name,
    },
    receiver: {
      _id: receiver._id,
      name: receiver.name,
    },
    message: doc.message || "",
    messageType: doc.messageType || "text",
    imageUrl: doc.imageUrl || "",
    reactions: (doc.reactions || []).map((r) => ({
      emoji: r.emoji,
      userId: r.userId?._id ? r.userId._id.toString() : r.userId.toString(),
      userName: r.userId?.name || "",
    })),
    createdAt: doc.createdAt,
  };
};

export default mongoose.model("Chat", chatSchema);
