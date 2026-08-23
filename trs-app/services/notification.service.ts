import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { Notification } from "@/models/Notification";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { NotificationPreference } from "@/models/NotificationPreference";
import { User } from "@/models/User";
import { publishNotificationCreated } from "@/services/realtimeEvents.service";

type NotificationCategory =
  | "transactional"
  | "reservations"
  | "rewards"
  | "promotions";

type NotificationChannel = "in_app" | "email" | "whatsapp";

type SendNotificationInput = {
  recipientId: string;
  eventKey: string;
  category: NotificationCategory;
  type:
    | "system"
    | "order"
    | "payment"
    | "reservation"
    | "reward"
    | "promotion"
    | "security";
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
  createdBy?: string;
  expiresAt?: Date | null;
};

async function getPreferences(userId: string) {
  return NotificationPreference.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId: new Types.ObjectId(userId),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
}

function channelEnabled(
  preference: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
  },
  channel: NotificationChannel,
) {
  if (channel === "in_app") return preference.inApp;
  if (channel === "email") return preference.email;
  return preference.whatsapp;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  message: string;
}) {
  const endpoint = process.env.EMAIL_PROVIDER_ENDPOINT;
  const token = process.env.EMAIL_PROVIDER_TOKEN;

  if (!endpoint || !token) {
    return { skipped: true, provider: "not_configured", messageId: "" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: input.to,
      subject: input.subject,
      text: input.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned ${response.status}.`);
  }

  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    messageId?: string;
  };

  return {
    skipped: false,
    provider: "http_email_provider",
    messageId: result.id ?? result.messageId ?? "",
  };
}

export async function sendWhatsAppMessage(input: {
  to: string;
  message: string;
}) {
  const endpoint = process.env.WHATSAPP_PROVIDER_ENDPOINT;
  const token = process.env.WHATSAPP_PROVIDER_TOKEN;

  if (!endpoint || !token) {
    return { skipped: true, provider: "not_configured", messageId: "" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: input.to,
      message: input.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp provider returned ${response.status}.`);
  }

  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    messageId?: string;
  };

  return {
    skipped: false,
    provider: "http_whatsapp_provider",
    messageId: result.id ?? result.messageId ?? "",
  };
}

export async function sendNotification(input: SendNotificationInput) {
  const user = await User.findById(input.recipientId).lean();
  if (!user) throw new AppError("Notification recipient not found.", 404);

  const preferences = await getPreferences(input.recipientId);
  if (!preferences) {
    throw new AppError("Unable to load notification preferences.", 500);
  }

  const categoryPreference = preferences[input.category];
  const requestedChannels = input.channels ?? ["in_app"];
  let notificationId: Types.ObjectId | null = null;

  if (
    requestedChannels.includes("in_app") &&
    channelEnabled(categoryPreference, "in_app")
  ) {
    const notification = await Notification.create({
      recipientId: user._id,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? "",
      metadata: input.metadata ?? {},
      expiresAt: input.expiresAt ?? null,
      createdBy: input.createdBy
        ? new Types.ObjectId(input.createdBy)
        : null,
    });

    notificationId = notification._id;

    await NotificationDelivery.create({
      notificationId,
      recipientId: user._id,
      channel: "in_app",
      eventKey: input.eventKey,
      destination: user._id.toString(),
      provider: "internal",
      status: "delivered",
      attempts: 1,
      lastAttemptAt: new Date(),
      sentAt: new Date(),
      deliveredAt: new Date(),
      payload: input.metadata ?? {},
    });
  }

  const externalChannels = requestedChannels.filter(
    (channel) => channel !== "in_app",
  );

  for (const channel of externalChannels) {
    const enabled = channelEnabled(categoryPreference, channel);
    const destination =
      channel === "email" ? user.email : String(user.phone ?? "");

    const delivery = await NotificationDelivery.create({
      notificationId,
      recipientId: user._id,
      channel,
      eventKey: input.eventKey,
      destination,
      status: enabled && destination ? "queued" : "skipped",
      payload: input.metadata ?? {},
    });

    if (!enabled || !destination) {
      delivery.failureReason = !enabled
        ? "Disabled in user preferences."
        : "Recipient destination is unavailable.";
      await delivery.save();
      continue;
    }

    try {
      delivery.attempts += 1;
      delivery.lastAttemptAt = new Date();

      const result =
        channel === "email"
          ? await sendEmail({
              to: destination,
              subject: input.title,
              message: input.message,
            })
          : await sendWhatsAppMessage({
              to: destination,
              message: `${input.title}\n${input.message}`,
            });

      delivery.provider = result.provider;
      delivery.providerMessageId = result.messageId;
      delivery.status = result.skipped ? "skipped" : "sent";
      delivery.sentAt = result.skipped ? null : new Date();
      delivery.failureReason = result.skipped
        ? "Provider environment variables are not configured."
        : "";
    } catch (error) {
      delivery.status = "failed";
      delivery.failureReason =
        error instanceof Error ? error.message : "Unknown delivery error.";
    }

    await delivery.save();
  }

  if (notificationId) {
    publishNotificationCreated({
      notificationId:
        notificationId.toString(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? "",
      ...(input.createdBy
        ? { actorId: input.createdBy }
        : {}),
    });
  }

  return { notificationId };
}

export async function sendBroadcast(input: {
  actorId: string;
  title: string;
  message: string;
  type:
    | "system"
    | "order"
    | "payment"
    | "reservation"
    | "reward"
    | "promotion"
    | "security";
  actionUrl: string;
  roleKeys: string[];
  userIds: string[];
  channels: NotificationChannel[];
  expiresAt: string | null;
}) {
  const filter: Record<string, unknown> = { isActive: true };

  if (input.userIds.length > 0 || input.roleKeys.length > 0) {
    filter.$or = [
      ...(input.userIds.length > 0
        ? [{ _id: { $in: input.userIds.map((id) => new Types.ObjectId(id)) } }]
        : []),
      ...(input.roleKeys.length > 0
        ? [{ roleKey: { $in: input.roleKeys } }]
        : []),
    ];
  }

  const recipients = await User.find(filter).select("_id").lean();

  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendNotification({
        recipientId: recipient._id.toString(),
        eventKey: "admin.broadcast",
        category:
          input.type === "promotion" ? "promotions" : "transactional",
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        channels: input.channels,
        createdBy: input.actorId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      }),
    ),
  );

  return {
    recipientCount: recipients.length,
    successful: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
