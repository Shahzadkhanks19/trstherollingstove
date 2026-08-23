import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectToDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
