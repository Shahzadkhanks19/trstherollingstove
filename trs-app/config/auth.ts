import { z } from "zod";

const schema = z.object({
  ACCESS_TOKEN_SECRET: z.string().min(32, "Must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z.string().min(32, "Must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  AUTH_COOKIE_DOMAIN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
  ),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = schema.safeParse({
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_TTL_SECONDS: process.env.ACCESS_TOKEN_TTL_SECONDS,
  ADMIN_ACCESS_TOKEN_TTL_SECONDS: process.env.ADMIN_ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS: process.env.REFRESH_TOKEN_TTL_SECONDS,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  PASSWORD_RESET_TTL_MINUTES: process.env.PASSWORD_RESET_TTL_MINUTES,
  EMAIL_VERIFICATION_TTL_HOURS: process.env.EMAIL_VERIFICATION_TTL_HOURS,
  MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS,
  LOGIN_LOCK_MINUTES: process.env.LOGIN_LOCK_MINUTES,
});

if (!parsed.success) {
  const missing = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
  throw new Error(
    `Invalid auth environment variables: ${missing}. Copy .env.local.example to .env.local and replace the secrets before production.`,
  );
}

export const authConfig = parsed.data;
