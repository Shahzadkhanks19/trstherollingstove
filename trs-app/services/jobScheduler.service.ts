import {
  enqueueJob,
} from "@/services/jobQueue.service";

function dateBucket(
  date: Date,
  bucketMinutes: number,
) {
  const bucketMs =
    bucketMinutes * 60 * 1000;

  return Math.floor(
    date.getTime() / bucketMs,
  );
}

export async function enqueueScheduledJobs(
  now = new Date(),
) {
  const tenMinuteBucket =
    dateBucket(now, 10);
  const dailyBucket =
    now.toISOString().slice(0, 10);

  const jobs = await Promise.all([
    enqueueJob({
      key: "coupons.expire",
      deduplicationKey:
        `coupons.expire:${tenMinuteBucket}`,
      maxAttempts: 3,
      priority: 80,
    }),
    enqueueJob({
      key:
        "reservations.reminder24h",
      deduplicationKey:
        `reservations.reminder24h:${tenMinuteBucket}`,
      maxAttempts: 3,
      priority: 90,
    }),
    enqueueJob({
      key:
        "reservations.reminder2h",
      deduplicationKey:
        `reservations.reminder2h:${tenMinuteBucket}`,
      maxAttempts: 3,
      priority: 95,
    }),
    enqueueJob({
      key: "notifications.cleanup",
      payload: {
        retentionDays: 90,
      },
      deduplicationKey:
        `notifications.cleanup:${dailyBucket}`,
      maxAttempts: 2,
      priority: 20,
    }),
    enqueueJob({
      key: "jobs.cleanup",
      payload: {
        retentionDays: 30,
      },
      deduplicationKey:
        `jobs.cleanup:${dailyBucket}`,
      maxAttempts: 2,
      priority: 10,
    }),
  ]);

  return {
    queued: jobs.filter(
      (entry) => entry.created,
    ).length,
    deduplicated: jobs.filter(
      (entry) => !entry.created,
    ).length,
    jobs: jobs.map((entry) => ({
      id: String(entry.job._id),
      key: entry.job.key,
      created: entry.created,
    })),
  };
}
