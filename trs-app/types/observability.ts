export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type CacheStatistics = {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
};

export type IndexIssue = {
  collection: string;
  type: "missing" | "duplicate";
  indexName: string;
  keys: Record<string, number>;
  recommendation: string;
};
