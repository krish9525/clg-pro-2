import { Hono } from "hono";
import ChatModel, { formatChatMessage } from "../models/Chat.js";
import { connectDb } from "../db.js";
import { isAuth } from "../middlewares/isAuth.js";
import { uploadToCloudinary } from "../cloudinary.js";

const router = new Hono();

const populateFields = [
  { path: "sender", select: "name email role" },
  { path: "receiver", select: "name email role" },
  { path: "reactions.userId", select: "name" },
];

router.get("/conversations/list", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const userId = c.get("user")._id.toString();
    const isAdmin = c.get("user").role === "admin";

    const messages = await ChatModel.find({
      $or: [{ sender: c.get("user")._id }, { receiver: c.get("user")._id }],
    })
      .sort({ createdAt: -1 })
      .populate(populateFields);

    const conversationsMap = new Map();
    for (const msg of messages) {
      const other =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      if (!isAdmin && other.role === "user" && other._id.toString() !== userId)
        continue;

      const otherId = other._id.toString();
      if (conversationsMap.has(otherId)) continue;

      conversationsMap.set(otherId, {
        user: { _id: other._id, name: other.name, email: other.email, role: other.role },
        lastMessage:
          msg.messageType === "image" ? "📷 Photo" : msg.message || "New message",
        lastMessageAt: msg.createdAt,
      });
    }

    return c.json({ conversations: Array.from(conversationsMap.values()) });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.post("/upload", isAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get("image");

    if (!imageFile) return c.json({ message: "Image file is required" }, 400);
    if (!imageFile.type.startsWith("image/"))
      return c.json({ message: "Only image files are allowed" }, 400);
    if (imageFile.size > 5 * 1024 * 1024)
      return c.json({ message: "File size exceeds 5MB" }, 400);

    const imageUrl = await uploadToCloudinary(
      imageFile,
      imageFile.name,
      c.env,
      "elearning/chat"
    );

    return c.json({ imageUrl });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

router.get("/:receiverId", isAuth, async (c) => {
  try {
    await connectDb(c.env);
    const senderId = c.get("user")._id;
    const receiverId = c.req.param("receiverId");

    const messages = await ChatModel.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate(populateFields);

    return c.json({ messages: messages.map(formatChatMessage) });
  } catch (e) {
    return c.json({ message: e.message }, 500);
  }
});

export default router;
