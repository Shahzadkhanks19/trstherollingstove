import { AppError } from "@/lib/errors/AppError";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const globalStore = globalThis as typeof globalThis & {
  trsRateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalStore.trsRateLimitStore ?? new Map<string, RateLimitEntry>();
globalStore.trsRateLimitStore = store;

export function resolveClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function enforceRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const existing = store.get(options.key);

  if (!existing || existing.resetAt <= now) {
    store.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt: now + options.windowMs,
    };
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    throw new AppError("Too many requests. Please try again later.", 429);
  }

  return {
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}
