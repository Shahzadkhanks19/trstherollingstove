import { Types } from "mongoose";

import { SecurityEvent } from "@/models/SecurityEvent";
import type {
  AuditSeverity,
  SecurityEventType,
} from "@/types/audit";

type RecordSecurityEventInput = {
  eventType: SecurityEventType;
  severity?: AuditSeverity;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function recordSecurityEvent(
  input: RecordSecurityEventInput,
) {
  return SecurityEvent.create({
    eventType: input.eventType,
    severity: input.severity ?? "warning",
    userId:
      input.userId &&
      Types.ObjectId.isValid(input.userId)
        ? new Types.ObjectId(input.userId)
        : null,
    email: input.email ?? "",
    ipAddress: input.ipAddress ?? "",
    userAgent: input.userAgent ?? "",
    route: input.route ?? "",
    message: input.message,
    metadata: input.metadata ?? {},
  });
}
