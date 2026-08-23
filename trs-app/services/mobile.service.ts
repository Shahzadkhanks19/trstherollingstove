import { Types } from "mongoose";

import { authConfig } from "@/config/auth";
import { AppError } from "@/lib/errors/AppError";
import { AuthSession } from "@/models/AuthSession";
import { CoinWallet } from "@/models/CoinWallet";
import { MobileDevice } from "@/models/MobileDevice";
import { Notification } from "@/models/Notification";
import { Order } from "@/models/Order";
import { Reservation } from "@/models/Reservation";
import { SystemSetting } from "@/models/SystemSetting";
import { serializeCustomer } from "@/services/userManagement.service";

export type MobileDeviceInput = {
  installationId: string;
  platform: "android" | "ios";
  pushToken?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
  locale?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
};

export async function upsertMobileDevice(
  userId: string,
  input: MobileDeviceInput,
) {
  return MobileDevice.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      installationId: input.installationId,
    },
    {
      $set: {
        platform: input.platform,
        pushToken: input.pushToken ?? "",
        deviceName: input.deviceName ?? "",
        appVersion: input.appVersion ?? "",
        osVersion: input.osVersion ?? "",
        locale: input.locale ?? "en-IN",
        timezone: input.timezone ?? "Asia/Kolkata",
        notificationsEnabled: input.notificationsEnabled ?? true,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
      $setOnInsert: {
        userId: new Types.ObjectId(userId),
        installationId: input.installationId,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  ).lean();
}

export async function revokeMobileDevice(
  userId: string,
  installationId?: string,
) {
  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    revokedAt: null,
  };

  if (installationId) {
    filter.installationId = installationId;
  }

  await MobileDevice.updateMany(filter, {
    $set: {
      revokedAt: new Date(),
      pushToken: "",
      notificationsEnabled: false,
    },
  });
}

export async function revokeMobileSession(
  userId: string,
  sessionId: string,
) {
  const session = await AuthSession.findOne({
    _id: sessionId,
    userId,
    revokedAt: null,
  });

  if (!session) {
    throw new AppError("Mobile session not found.", 404);
  }

  session.revokedAt = new Date();
  session.revokeReason = "Mobile logout";
  await session.save();
}

export async function getMobileBootstrap(userId: string) {
  const now = new Date();

  const [profile, wallet, recentOrders, upcomingReservations, unreadCount] =
    await Promise.all([
      serializeCustomer(userId),
      CoinWallet.findOne({ customerId: userId }).lean(),
      Order.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Reservation.find({
        customerId: userId,
        reservationDate: { $gte: now },
        status: { $in: ["pending", "confirmed"] },
      })
        .sort({ reservationDate: 1, startTime: 1 })
        .limit(3)
        .lean(),
      Notification.countDocuments({
        recipientId: userId,
        isRead: false,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      }),
    ]);

  return {
    profile,
    wallet: wallet ?? {
      balance: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
      lastActivityAt: null,
    },
    recentOrders,
    upcomingReservations,
    unreadNotificationCount: unreadCount,
  };
}

export async function getMobileHome(userId: string) {
  const [bootstrap, businessSetting] = await Promise.all([
    getMobileBootstrap(userId),
    SystemSetting.findOne({ section: "business" }).lean(),
  ]);

  return {
    ...bootstrap,
    business: businessSetting?.publicData ?? {},
  };
}

export async function getMobileAppConfig() {
  const [operationsSetting, businessSetting] = await Promise.all([
    SystemSetting.findOne({ section: "operations" }).lean(),
    SystemSetting.findOne({ section: "business" }).lean(),
  ]);

  const operationsData =
    operationsSetting?.publicData &&
    typeof operationsSetting.publicData === "object"
      ? operationsSetting.publicData as Record<string, unknown>
      : {};

  const configured =
    operationsData.mobile &&
    typeof operationsData.mobile === "object"
      ? operationsData.mobile as Record<string, unknown>
      : {};

  return {
    minimumSupportedVersion: "1.0.0",
    latestVersion: "1.0.0",
    forceUpdate: false,
    maintenanceMode: false,
    supportEmail: "",
    supportPhone: "",
    accessTokenExpiresIn: authConfig.ACCESS_TOKEN_TTL_SECONDS,
    ...configured,
    business: businessSetting?.publicData ?? {},
  };
}
