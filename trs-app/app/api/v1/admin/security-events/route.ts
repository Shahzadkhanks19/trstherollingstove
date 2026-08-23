import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SecurityEvent } from "@/models/SecurityEvent";
import type {
  AuditSeverity,
  SecurityEventType,
} from "@/types/audit";
import { securityEventQuerySchema } from "@/validators/audit";

type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

type TextSearchFilter = {
  $regex: string;
  $options: "i";
};

type SecurityEventFilter = {
  eventType?: SecurityEventType;
  severity?: AuditSeverity;
  resolved?: boolean;
  createdAt?: DateRangeFilter;
  $or?: Array<
    | { message: TextSearchFilter }
    | { email: TextSearchFilter }
    | { ipAddress: TextSearchFilter }
    | { route: TextSearchFilter }
  >;
};

export async function GET(request: Request) {
  try {
    await requirePermission("audit_logs.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed =
      securityEventQuerySchema.parse(
        Object.fromEntries(
          url.searchParams.entries(),
        ),
      );

    const filter: SecurityEventFilter = {};

    if (parsed.eventType) {
      filter.eventType = parsed.eventType;
    }

    if (parsed.severity) {
      filter.severity = parsed.severity;
    }

    if (parsed.resolved !== undefined) {
      filter.resolved = parsed.resolved;
    }

    if (parsed.search) {
      const searchRegex: TextSearchFilter = {
        $regex: parsed.search,
        $options: "i",
      };

      filter.$or = [
        { message: searchRegex },
        { email: searchRegex },
        { ipAddress: searchRegex },
        { route: searchRegex },
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

    const [events, total] =
      await Promise.all([
        SecurityEvent.find(filter)
          .populate(
            "resolvedBy",
            "name email",
          )
          .sort({
            resolved: 1,
            severity: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(parsed.limit)
          .lean(),
        SecurityEvent.countDocuments(filter),
      ]);

    return successResponse({
      items: events,
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