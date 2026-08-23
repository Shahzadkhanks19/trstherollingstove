export const BACKGROUND_JOB_KEYS = [
  "coupons.expire",
  "reservations.reminder24h",
  "reservations.reminder2h",
  "notifications.cleanup",
  "jobs.cleanup",
] as const;

export type BackgroundJobKey =
  (typeof BACKGROUND_JOB_KEYS)[number];

export const BACKGROUND_JOB_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type BackgroundJobStatus =
  (typeof BACKGROUND_JOB_STATUSES)[number];

export const JOB_RUN_STATUSES = [
  "running",
  "completed",
  "failed",
] as const;

export type JobRunStatus =
  (typeof JOB_RUN_STATUSES)[number];
