import { z } from "zod";

import {
  DATA_EXPORT_FORMATS,
  RESTORE_MODES,
} from "@/types/dataTransfer";

export const exportQuerySchema = z.object({
  collection: z
    .string()
    .trim()
    .min(1)
    .max(120),
  format: z
    .enum(DATA_EXPORT_FORMATS)
    .default("json"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(10_000),
});

export const backupQuerySchema = z.object({
  collections: z
    .string()
    .trim()
    .optional(),
  limitPerCollection: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(100_000),
});

export const restorePayloadSchema = z.object({
  mode: z
    .enum(RESTORE_MODES)
    .default("insert"),
  dryRun: z
    .boolean()
    .default(true),
  backup: z.object({
    manifest: z.object({
      version: z.literal(1),
      application: z.literal("trs-app"),
      createdAt: z.string().min(1),
      databaseName: z.string().min(1),
      collections: z.array(
        z.object({
          name: z.string().min(1).max(120),
          documentCount: z
            .number()
            .int()
            .min(0),
        }),
      ),
    }),
    data: z.record(
      z.string(),
      z.array(z.record(z.string(), z.unknown())),
    ),
  }),
});
