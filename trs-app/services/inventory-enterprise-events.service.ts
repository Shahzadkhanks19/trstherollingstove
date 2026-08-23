import { AuditLog } from "@/models/AuditLog";
import { Notification } from "@/models/Notification";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";

const ADMIN_ROLE_KEYS = [
  "super_admin",
  "admin",
  "manager",
];

export async function createInventoryAdminNotifications(input: {
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}) {
  const roles = await Role.find({
    key: { $in: ADMIN_ROLE_KEYS },
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!roles.length) return { createdCount: 0 };

  const users = await User.find({
    roleId: { $in: roles.map((role) => role._id) },
    isActive: true,
  })
    .select("_id")
    .lean();

  if (!users.length) return { createdCount: 0 };

  const result = await Notification.insertMany(
    users.map((user) => ({
      recipientId: user._id,
      type: "system",
      title: input.title,
      message: input.message,
      actionUrl:
        input.actionUrl ??
        "/admin/inventory-analytics",
      metadata: {
        module: "inventory",
        ...(input.metadata ?? {}),
      },
      createdBy: input.createdBy ?? null,
    })),
    { ordered: false },
  );

  for (const notification of result) {
    publishRealtimeEventSafely({
      event: "notification.created",
      entityId: String(notification._id),
      data: {
        notificationId: String(notification._id),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata ?? {},
        isRead: false,
        createdAt: notification.createdAt,
      },
      target: {
        userIds: [String(notification.recipientId)],
      },
    });
  }

  return { createdCount: result.length };
}

export async function recordInventoryAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  return AuditLog.create({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? "",
    description: input.description,
    metadata: {
      module: "inventory",
      ...(input.metadata ?? {}),
    },
  });
}

export function publishInventoryEnterpriseEvent(input: {
  event:
    | "inventory.alert_created"
    | "inventory.alert_updated"
    | "inventory.report_completed"
    | "inventory.report_cache_invalidated";
  entityId?: string;
  data: Record<string, unknown>;
}) {
  publishRealtimeEventSafely({
    event: input.event,
    entityId: input.entityId,
    data: input.data,
    target: {
      roleKeys: ADMIN_ROLE_KEYS,
    },
  });
}
