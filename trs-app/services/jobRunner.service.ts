import { randomUUID } from "crypto";

import { BackgroundJob } from "@/models/BackgroundJob";
import { JobRun } from "@/models/JobRun";
import {
  retryDelayMs,
} from "@/lib/jobs/time";
import {
  executeJobHandler,
} from "@/services/jobHandlers.service";
import type {
  BackgroundJobKey,
} from "@/types/jobs";

type WorkerResult = {
  processed: number;
  completed: number;
  failed: number;
  retried: number;
};

function errorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message.slice(0, 2000)
    : "Unknown background job error.";
}

async function claimNextJob(
  workerId: string,
) {
  const staleLockBefore = new Date(
    Date.now() - 15 * 60 * 1000,
  );

  return BackgroundJob.findOneAndUpdate(
    {
      runAt: { $lte: new Date() },
      attempts: {
        $lt: 20,
      },
      $or: [
        {
          status: "queued",
        },
        {
          status: "processing",
          lockedAt: {
            $lt: staleLockBefore,
          },
        },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: new Date(),
        lockedBy: workerId,
        startedAt: new Date(),
        lastError: "",
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      sort: {
        priority: -1,
        runAt: 1,
        createdAt: 1,
      },
      returnDocument: "after",
    },
  );
}

export async function runBackgroundWorker(
  limit = 10,
) {
  const workerId =
    `${process.env.HOSTNAME ?? "trs-worker"}-` +
    randomUUID();

  const summary: WorkerResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  };

  for (let index = 0; index < limit; index += 1) {
    const job =
      await claimNextJob(workerId);

    if (!job) {
      break;
    }

    summary.processed += 1;

    const startedAt = new Date();

    const run = await JobRun.create({
      jobId: job._id,
      key: job.key,
      status: "running",
      workerId,
      attempt: job.attempts,
      startedAt,
    });

    try {
      const result =
        await executeJobHandler(
          job.key as BackgroundJobKey,
          (job.payload ?? {}) as
            Record<string, unknown>,
        );

      const completedAt = new Date();

      await BackgroundJob.updateOne(
        {
          _id: job._id,
          lockedBy: workerId,
        },
        {
          $set: {
            status: "completed",
            completedAt,
            lockedAt: null,
            lockedBy: "",
            result,
            lastError: "",
          },
        },
      );

      await JobRun.updateOne(
        { _id: run._id },
        {
          $set: {
            status: "completed",
            completedAt,
            durationMs:
              completedAt.getTime() -
              startedAt.getTime(),
            result,
          },
        },
      );

      summary.completed += 1;
    } catch (error) {
      const message =
        errorMessage(error);
      const failedAt = new Date();

      const shouldRetry =
        job.attempts < job.maxAttempts;

      await BackgroundJob.updateOne(
        {
          _id: job._id,
          lockedBy: workerId,
        },
        {
          $set: {
            status: shouldRetry
              ? "queued"
              : "failed",
            runAt: shouldRetry
              ? new Date(
                  Date.now() +
                    retryDelayMs(
                      job.attempts,
                    ),
                )
              : job.runAt,
            failedAt: shouldRetry
              ? null
              : failedAt,
            lockedAt: null,
            lockedBy: "",
            lastError: message,
          },
        },
      );

      await JobRun.updateOne(
        { _id: run._id },
        {
          $set: {
            status: "failed",
            completedAt: failedAt,
            durationMs:
              failedAt.getTime() -
              startedAt.getTime(),
            error: message,
          },
        },
      );

      if (shouldRetry) {
        summary.retried += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return {
    workerId,
    ...summary,
  };
}
