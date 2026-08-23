import { z } from "zod";

import {
  BACKGROUND_JOB_KEYS,
  BACKGROUND_JOB_STATUSES,
} from "@/types/jobs";

export const enqueueJobSchema = z.object({
  key: z.enum(BACKGROUND_JOB_KEYS),
  payload: z
    .record(z.string(), z.unknown())
    .default({}),
  priority: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(50),
  runAt: z.coerce.date().optional(),
  maxAttempts: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(3),
  deduplicationKey: z
    .string()
    .trim()
    .max(300)
    .optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  key: z.enum(BACKGROUND_JOB_KEYS).optional(),
  status: z
    .enum(BACKGROUND_JOB_STATUSES)
    .optional(),
  search: z
    .string()
    .trim()
    .max(200)
    .optional(),
});

export const runWorkerSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
});
