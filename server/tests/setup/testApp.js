/**
 * Creates a configured Express app for integration tests —
 * identical to production but WITHOUT starting the HTTP server or Socket.io.
 */
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "../../middlewares/errorHandler.js";

import userRoutes   from "../../routes/user.js";
import courseRoutes from "../../routes/course.js";
import adminRoutes  from "../../routes/admin.js";
import chatRoutes   from "../../routes/chat.js";

export function createTestApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Routes (v1 + legacy alias)
  app.use("/api/v1",       userRoutes);
  app.use("/api/v1",       courseRoutes);
  app.use("/api/v1",       adminRoutes);
  app.use("/api/v1/chat",  chatRoutes);
  app.use("/api",          userRoutes);
  app.use("/api",          courseRoutes);
  app.use("/api",          adminRoutes);
  app.use("/api/chat",     chatRoutes);

  app.use(errorHandler);
  return app;
}
