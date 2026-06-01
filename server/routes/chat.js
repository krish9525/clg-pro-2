import express from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { isAuth } from "../middlewares/isAuth.js";
import {
  getChatHistory,
  getConversations,
  uploadChatImage,
} from "../controllers/chat.js";

const router = express.Router();

const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads");
  },
  filename(req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `chat-${uuid()}.${ext}`);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
}).single("image");

router.get("/conversations/list", isAuth, getConversations);
router.post("/upload", isAuth, (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadChatImage);
router.get("/:receiverId", isAuth, getChatHistory);

export default router;
