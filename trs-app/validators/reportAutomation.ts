import { z } from "zod";

export const reportAutomationSettingsSchema = z.object({
  workerConcurrency: z.coerce.number().int().min(1).max(25),
  maxRowsPerReport: z.coerce.number().int().min(100).max(100000),
  artifactRetentionDays: z.coerce.number().int().min(1).max(3650),
  failedJobRetentionDays: z.coerce.number().int().min(1).max(3650),
  notificationOnSuccess: z.boolean(),
  notificationOnFailure: z.boolean(),
  emailDeliveryEnabled: z.boolean(),
  queueWarningThreshold: z.coerce.number().int().min(1).max(100000),
  staleWorkerMinutes: z.coerce.number().int().min(5).max(1440),
});
