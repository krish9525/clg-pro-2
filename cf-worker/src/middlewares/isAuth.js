import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { connectDb } from "../db.js";

export const isAuth = async (c, next) => {
  try {
    const token = c.req.header("token");
    if (!token) return c.json({ message: "Please Login" }, 403);

    const decodedData = jwt.verify(token, c.env.Jwt_Sec);
    await connectDb(c.env);
    c.set("user", await User.findById(decodedData._id));
    await next();
  } catch {
    return c.json({ message: "Login First" }, 500);
  }
};

export const isAdmin = async (c, next) => {
  const user = c.get("user");
  if (user?.role !== "admin") return c.json({ message: "You are not admin" }, 403);
  await next();
};
