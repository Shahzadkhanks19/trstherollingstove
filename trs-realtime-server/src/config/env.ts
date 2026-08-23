import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  MONGODB_URI: z.string().trim().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REALTIME_INTERNAL_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().trim().min(1),
  TRUST_PROXY: z.string().default("false").transform((value) => value === "true"),
  MAX_CONNECTIONS_PER_USER: z.coerce.number().int().positive().max(100).default(10),
  ACCESS_COOKIE_NAME: z.string().trim().min(1).default("trs_access")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid realtime server environment:");
  for (const issue of parsed.error.issues) console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean);
