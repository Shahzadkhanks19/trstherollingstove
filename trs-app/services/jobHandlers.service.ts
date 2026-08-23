import { BackgroundJob } from "@/models/BackgroundJob";
import { Coupon } from "@/models/Coupon";
import { Notification } from "@/models/Notification";
import { Reservation } from "@/models/Reservation";
import {
  combineReservationDateTime,
} from "@/lib/jobs/time";
import type {
  BackgroundJobKey,
} from "@/types/jobs";

type JobPayload = Record<string, unknown>;

type JobHandlerResult =
  Record<string, unknown>;

type JobHandler = (
  payload: JobPayload,
) => Promise<JobHandlerResult>;

async function expireCoupons() {
  const now = new Date();

  const result = await Coupon.updateMany(
    {
      isActive: true,
      deletedAt: null,
      expiresAt: { $lte: now },
    },
    {
      $set: {
        isActive: false,
      },
    },
  );

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
}

async function createReservationReminders(
  hoursBefore: 24 | 2,
) {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() +
      (hoursBefore * 60 - 10) * 60 * 1000,
  );
  const windowEnd = new Date(
    now.getTime() +
      (hoursBefore * 60 + 10) * 60 * 1000,
  );

  const reminderField =
    hoursBefore === 24
      ? "reminder24hSent"
      : "reminder2hSent";

  const reservations = await Reservation.find({
    status: "confirmed",
    [reminderField]: false,
    reservationDate: {
      $gte: new Date(
        windowStart.getFullYear(),
        windowStart.getMonth(),
        windowStart.getDate(),
      ),
      $lte: new Date(
        windowEnd.getFullYear(),
        windowEnd.getMonth(),
        windowEnd.getDate(),
        23,
        59,
        59,
        999,
      ),
    },
  })
    .select(
      [
        "_id",
        "customerId",
        "customerSnapshot",
        "reservationNumber",
        "reservationDate",
        "startTime",
        reminderField,
      ].join(" "),
    )
    .lean();

  let sent = 0;

  for (const reservation of reservations) {
    const reservationDateTime =
      combineReservationDateTime(
        new Date(reservation.reservationDate),
        reservation.startTime,
      );

    if (
      reservationDateTime < windowStart ||
      reservationDateTime > windowEnd
    ) {
      continue;
    }

    const claim =
      await Reservation.updateOne(
        {
          _id: reservation._id,
          [reminderField]: false,
        },
        {
          $set: {
            [reminderField]: true,
          },
        },
      );

    if (claim.modifiedCount !== 1) {
      continue;
    }

    const customerName =
      reservation.customerSnapshot?.name ||
      "Customer";

    await Notification.create({
      recipientId: reservation.customerId,
      type: "reservation",
      title: `Reservation reminder`,
      message:
        `Hi ${customerName}, your reservation ` +
        `${reservation.reservationNumber} is scheduled ` +
        `for ${reservation.startTime}.`,
      actionUrl: "/dashboard/reservations",
      metadata: {
        reservationId:
          String(reservation._id),
        reservationNumber:
          reservation.reservationNumber,
        hoursBefore,
      },
      expiresAt: reservationDateTime,
    });

    sent += 1;
  }

  return {
    checked: reservations.length,
    sent,
    hoursBefore,
  };
}

async function cleanupNotifications(
  payload: JobPayload,
) {
  const retentionDays =
    typeof payload.retentionDays === "number"
      ? Math.max(
          1,
          Math.min(365, payload.retentionDays),
        )
      : 90;

  const cutoff = new Date(
    Date.now() -
      retentionDays * 24 * 60 * 60 * 1000,
  );

  const result =
    await Notification.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoff },
    });

  return {
    deleted: result.deletedCount,
    retentionDays,
  };
}

async function cleanupJobs(
  payload: JobPayload,
) {
  const retentionDays =
    typeof payload.retentionDays === "number"
      ? Math.max(
          1,
          Math.min(365, payload.retentionDays),
        )
      : 30;

  const cutoff = new Date(
    Date.now() -
      retentionDays * 24 * 60 * 60 * 1000,
  );

  const result =
    await BackgroundJob.deleteMany({
      status: {
        $in: [
          "completed",
          "failed",
          "cancelled",
        ],
      },
      updatedAt: { $lt: cutoff },
    });

  return {
    deleted: result.deletedCount,
    retentionDays,
  };
}

const handlers: Record<
  BackgroundJobKey,
  JobHandler
> = {
  "coupons.expire": async () =>
    expireCoupons(),
  "reservations.reminder24h":
    async () =>
      createReservationReminders(24),
  "reservations.reminder2h":
    async () =>
      createReservationReminders(2),
  "notifications.cleanup":
    cleanupNotifications,
  "jobs.cleanup": cleanupJobs,
};

export async function executeJobHandler(
  key: BackgroundJobKey,
  payload: JobPayload,
) {
  return handlers[key](payload);
}
