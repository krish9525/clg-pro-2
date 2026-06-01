import Chat, { formatChatMessage } from "../models/Chat.js";
import TryCatch from "../middlewares/TryCatch.js";

const populateFields = [
  { path: "sender", select: "name email role" },
  { path: "receiver", select: "name email role" },
  { path: "reactions.userId", select: "name" },
];

export const getChatHistory = TryCatch(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user._id;

  const messages = await Chat.find({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate(populateFields);

  res.status(200).json({
    messages: messages.map(formatChatMessage),
  });
});

export const getConversations = TryCatch(async (req, res) => {
  const userId = req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  const filter = isAdmin
    ? { $or: [{ sender: req.user._id }, { receiver: req.user._id }] }
    : {
        $or: [
          { sender: req.user._id },
          { receiver: req.user._id },
        ],
      };

  const messages = await Chat.find(filter)
    .sort({ createdAt: -1 })
    .populate(populateFields);

  const conversationsMap = new Map();

  for (const msg of messages) {
    const other =
      msg.sender._id.toString() === userId ? msg.receiver : msg.sender;

    if (!isAdmin && other.role === "user" && other._id.toString() !== userId) {
      continue;
    }

    const otherId = other._id.toString();
    if (conversationsMap.has(otherId)) continue;

    const preview =
      msg.messageType === "image"
        ? "📷 Photo"
        : msg.message || "New message";

    conversationsMap.set(otherId, {
      user: {
        _id: other._id,
        name: other.name,
        email: other.email,
        role: other.role,
      },
      lastMessage: preview,
      lastMessageAt: msg.createdAt,
    });
  }

  res.status(200).json({
    conversations: Array.from(conversationsMap.values()),
  });
});

export const uploadChatImage = TryCatch(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  res.status(200).json({
    imageUrl: `/uploads/${req.file.filename}`,
  });
});
