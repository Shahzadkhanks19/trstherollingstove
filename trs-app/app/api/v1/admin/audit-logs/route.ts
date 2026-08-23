import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SystemAuditLog } from "@/models/SystemAuditLog";
import type {
  AuditOutcome,
  AuditSeverity,
} from "@/types/audit";
import { auditLogQuerySchema } from "@/validators/audit";

type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

type TextSearchFilter = {
  $regex: string;
  $options: "i";
};

type AuditLogFilter = {
  module?: string;
  action?: string;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  actorId?: string;
  createdAt?: DateRangeFilter;
  $or?: Array<
    | { description: TextSearchFilter }
    | { actorName: TextSearchFilter }
    | { actorEmail: TextSearchFilter }
    | { entityId: TextSearchFilter }
    | { requestId: TextSearchFilter }
  >;
};

export async function GET(request: Request) {
  try {
    await requirePermission("audit_logs.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed = auditLogQuerySchema.parse(
      Object.fromEntries(
        url.searchParams.entries(),
      ),
    );

    const filter: AuditLogFilter = {};

    if (parsed.module) {
      filter.module = parsed.module;
    }

    if (parsed.action) {
      filter.action = parsed.action;
    }

    if (parsed.severity) {
      filter.severity = parsed.severity;
    }

    if (parsed.outcome) {
      filter.outcome = parsed.outcome;
    }

    if (parsed.actorId) {
      filter.actorId = parsed.actorId;
    }

    if (parsed.search) {
      const searchRegex: TextSearchFilter = {
        $regex: parsed.search,
        $options: "i",
      };

      filter.$or = [
        { description: searchRegex },
        { actorName: searchRegex },
        { actorEmail: searchRegex },
        { entityId: searchRegex },
        { requestId: searchRegex },
      ];
    }

    if (parsed.dateFrom || parsed.dateTo) {
      filter.createdAt = {};

      if (parsed.dateFrom) {
        filter.createdAt.$gte =
          parsed.dateFrom;
      }

      if (parsed.dateTo) {
        filter.createdAt.$lte =
          parsed.dateTo;
      }
    }

    const skip =
      (parsed.page - 1) * parsed.limit;

    const [logs, total] = await Promise.all([
      SystemAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
      SystemAuditLog.countDocuments(filter),
    ]);

    return successResponse({
      items: logs,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages: Math.ceil(
          total / parsed.limit,
        ),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}