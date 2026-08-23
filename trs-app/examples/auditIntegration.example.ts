import {
  getRequestId,
  getRequestIp,
  getRequestUserAgent,
} from "@/lib/audit/requestContext";
import { writeAuditLog } from "@/services/audit.service";
import { recordSecurityEvent } from "@/services/securityEvent.service";

/**
 * Successful admin action example:
 */
export async function logOrderCancellation(
  request: Request,
  actor: {
    id: string;
    name: string;
    email: string;
    roleKey: string;
  },
  orderId: string,
) {
  await writeAuditLog({
    actor,
    action: "order.cancel",
    module: "orders",
    entityType: "Order",
    entityId: orderId,
    description:
      "Administrator cancelled an order.",
    severity: "warning",
    outcome: "success",
    ipAddress: getRequestIp(request),
    userAgent:
      getRequestUserAgent(request),
    requestId: getRequestId(request),
  });
}

/**
 * Failed-login security example:
 */
export async function logFailedLogin(
  request: Request,
  email: string,
) {
  await recordSecurityEvent({
    eventType: "login_failure",
    severity: "warning",
    email,
    ipAddress: getRequestIp(request),
    userAgent:
      getRequestUserAgent(request),
    route: new URL(request.url).pathname,
    message:
      "Authentication failed for the supplied credentials.",
  });
}
