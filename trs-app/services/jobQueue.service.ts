import { Types } from "mongoose";

import { BackgroundJob } from "@/models/BackgroundJob";
import type {
  BackgroundJobKey,
} from "@/types/jobs";

type EnqueueJobInput = {
  key: BackgroundJobKey;
  payload?: Record<string, unknown>;
  priority?: number;
  runAt?: Date;
  maxAttempts?: number;
  deduplicationKey?: string;
  createdBy?: string;
};

export async function enqueueJob(
  input: EnqueueJobInput,
) {
  const deduplicationKey =
    input.deduplicationKey?.trim() ?? "";

  if (deduplicationKey) {
    const existing =
      await BackgroundJob.findOne({
        deduplicationKey,
        status: {
          $in: ["queued", "processing"],
        },
      });

    if (existing) {
      return {
        job: existing,
        created: false,
      };
    }
  }

  const job = await BackgroundJob.create({
    key: input.key,
    payload: input.payload ?? {},
    priority: input.priority ?? 50,
    runAt: input.runAt ?? new Date(),
    maxAttempts: input.maxAttempts ?? 3,
    deduplicationKey,
    createdBy:
      input.createdBy &&
      Types.ObjectId.isValid(input.createdBy)
        ? new Types.ObjectId(
            input.createdBy,
          )
        : null,
  });

  return {
    job,
    created: true,
  };
}
