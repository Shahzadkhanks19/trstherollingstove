import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_NAME: z.string().min(1).default("The Rolling Stove"),

  APP_URL: z.url(),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  NEXT_PUBLIC_REALTIME_SERVER_URL: z.url(),
});

const parsedEnvironment = environmentSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  NEXT_PUBLIC_REALTIME_SERVER_URL:
    process.env.NEXT_PUBLIC_REALTIME_SERVER_URL,
});

if (!parsedEnvironment.success) {
  console.error(
    "Invalid environment variables:",
    parsedEnvironment.error.flatten().fieldErrors,
  );

  throw new Error("Environment validation failed.");
}

export const env = parsedEnvironment.data;