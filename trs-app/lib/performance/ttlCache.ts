import type { CacheStatistics } from "@/types/observability";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class TtlCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      this.evictions += 1;
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, ttlMs),
    });
  }

  delete(key: string) {
    return this.entries.delete(key);
  }

  clear() {
    const count = this.entries.size;
    this.entries.clear();
    this.evictions += count;
  }

  prune() {
    const now = Date.now();

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
        this.evictions += 1;
      }
    }
  }

  stats(): CacheStatistics {
    this.prune();

    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }
}

const globalCache = globalThis as typeof globalThis & {
  trsTtlCache?: TtlCache;
};

export const ttlCache = globalCache.trsTtlCache ?? new TtlCache();
globalCache.trsTtlCache = ttlCache;

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cachedValue = ttlCache.get<T>(key);

  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const value = await loader();
  ttlCache.set(key, value, ttlMs);
  return value;
}
