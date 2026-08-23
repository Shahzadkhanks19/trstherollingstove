import { Types } from "mongoose";

import { SystemAuditLog } from "@/models/SystemAuditLog";
import type {
  AuditOutcome,
  AuditSeverity,
} from "@/types/audit";

type AuditActor = {
  id?: string;
  name?: string;
  email?: string;
  roleKey?: string;
};

type WriteAuditLogInput = {
  actor?: AuditActor | null;

  /**
   * Backward compatibility for Modules 3–10.
   * Newer modules may pass the complete `actor` object instead.
   */
  actorUserId?: string;

  action: string;

  /**
   * Optional for compatibility with older modules.
   * When omitted, it is derived from the action prefix or entity type.
   */
  module?: string;

  entityType?: string;
  entityId?: string;
  description: string;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

function deriveAuditModule(
  input: WriteAuditLogInput,
) {
  if (input.module?.trim()) {
    return input.module.trim();
  }

  const actionPrefix = input.action
    .split(".")[0]
    ?.trim();

  if (actionPrefix) {
    return actionPrefix;
  }

  if (input.entityType?.trim()) {
    return input.entityType
      .trim()
      .toLowerCase();
  }

  return "system";
}

export async function writeAuditLog(
  input: WriteAuditLogInput,
) {
  const actorId =
    input.actor?.id ?? input.actorUserId;

  return SystemAuditLog.create({
    actorId:
      actorId &&
      Types.ObjectId.isValid(actorId)
        ? new Types.ObjectId(actorId)
        : null,
    actorName: input.actor?.name ?? "",
    actorEmail: input.actor?.email ?? "",
    actorRole: input.actor?.roleKey ?? "",
    action: input.action,
    module: deriveAuditModule(input),
    entityType: input.entityType ?? "",
    entityId: input.entityId ?? "",
    description: input.description,
    severity: input.severity ?? "info",
    outcome: input.outcome ?? "success",
    ipAddress: input.ipAddress ?? "",
    userAgent: input.userAgent ?? "",
    requestId: input.requestId ?? "",
    metadata: input.metadata ?? {},
  });
}