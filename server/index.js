import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import Razorpay from "razorpay";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerChatSocket } from "./socket/chatSocket.js";

dotenv.config();

export const instance = new Razorpay({
  key_id: process.env.Razorpay_Key,
  key_secret: process.env.Razorpay_Secret,
});

const app = express();

// using middlewares
app.use(express.json());

const allowedOrigins = [
  process.env.frontendurl,
  "http://localhost:8080",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy block: ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

const port = process.env.PORT || 8002;

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.use("/uploads", express.static("uploads"));

// importing routes
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";

// using routes
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", adminRoutes);
app.use("/api/chat", chatRoutes);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : ["http://localhost:5174"],
    credentials: true,
  },
});

const userSocketMap = new Map();
registerChatSocket(io, userSocketMap);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
  connectDb();
});
