export type ReadinessCheckStatus =
  | "pass"
  | "warn"
  | "fail";

export type ReadinessCheck = {
  name: string;
  status: ReadinessCheckStatus;
  message: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

export type ProductionReadinessReport = {
  ready: boolean;
  checkedAt: string;
  checks: ReadinessCheck[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
};
