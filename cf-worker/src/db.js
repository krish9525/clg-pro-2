import * as mongoose from "mongoose";

let cached = null;

export async function connectDb(env) {
  if (cached && mongoose.connection.readyState === 1) return cached;
  cached = await mongoose.connect(env.DB, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,
  });
  return cached;
}

// Re-export mongoose so models can use it without re-importing
export { mongoose };
