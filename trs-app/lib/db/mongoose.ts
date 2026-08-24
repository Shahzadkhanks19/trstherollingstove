import mongoose, { type Mongoose } from "mongoose";

import "@/models/registerModels";

import { env } from "@/config/env";

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    const isVercel = Boolean(process.env.VERCEL);

    cached.promise = mongoose.connect(env.MONGODB_URI, {
      bufferCommands: false,
      // Vercel can create multiple warm function instances, so keep each pool
      // deliberately small. A persistent VPS runs one long-lived app process
      // and benefits from a slightly larger shared pool for concurrent POS,
      // admin and public requests.
      maxPoolSize: isVercel ? 4 : 10,
      minPoolSize: isVercel ? 0 : 1,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
