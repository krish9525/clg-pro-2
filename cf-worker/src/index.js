import { Hono } from "hono";
import { cors } from "hono/cors";
import { ChatRoom } from "./durable-objects/ChatRoom.js";
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";

export { ChatRoom };

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "https://mern-elearning.pages.dev";
      if (
        origin === "https://mern-elearning.pages.dev" ||
        origin.endsWith(".mern-elearning.pages.dev") ||
        origin.startsWith("http://localhost:")
      ) return origin;
      return "https://mern-elearning.pages.dev";
    },
    allowHeaders: ["Content-Type", "token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.get("/", (c) => c.text("Server is working"));

// WebSocket upgrade → Durable Object
app.get("/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket", 426);
  }

  const id = c.env.CHAT_ROOM.idFromName("global");
  const stub = c.env.CHAT_ROOM.get(id);

  return stub.fetch(c.req.raw);
});

// API routes
app.route("/api", userRoutes);
app.route("/api", courseRoutes);
app.route("/api", adminRoutes);
app.route("/api/chat", chatRoutes);

export default app;
