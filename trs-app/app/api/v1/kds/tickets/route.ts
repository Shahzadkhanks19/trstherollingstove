import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { KitchenTicket } from "@/models/KitchenTicket";

const VALID_STATUSES = [
  "queued",
  "accepted",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;

const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function currentIndiaDayRange() {
  const indiaNow = new Date(Date.now() + INDIA_OFFSET_MS);

  const start = new Date(
    Date.UTC(
      indiaNow.getUTCFullYear(),
      indiaNow.getUTCMonth(),
      indiaNow.getUTCDate(),
    ) - INDIA_OFFSET_MS,
  );

  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

export async function GET(request: Request) {
  try {
    await requirePermission("kds.use");
    await connectToDatabase();

    const url = new URL(request.url);
    const stationId = url.searchParams.get("stationId");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");

    const filter: Record<string, unknown> = {};
    const { start, end } = currentIndiaDayRange();

    const todayOrderDateFilter = [
      {
        createdFromOrderAt: {
          $gte: start,
          $lt: end,
        },
      },
      {
        createdFromOrderAt: null,
        createdAt: {
          $gte: start,
          $lt: end,
        },
      },
      {
        createdFromOrderAt: { $exists: false },
        createdAt: {
          $gte: start,
          $lt: end,
        },
      },
    ];

    if (stationId) {
      filter.stationId = stationId;
    }

    if (
      status &&
      VALID_STATUSES.includes(
        status as (typeof VALID_STATUSES)[number],
      )
    ) {
      filter.status = status;

      if (status === "served") {
        filter.$or = todayOrderDateFilter;
      }
    } else {
      filter.$or = [
        {
          status: {
            $in: [
              "queued",
              "accepted",
              "preparing",
              "ready",
            ],
          },
        },
        ...todayOrderDateFilter.map((dateFilter) => ({
          status: "served",
          ...dateFilter,
        })),
      ];
    }

    if (
      priority &&
      ["normal", "high", "urgent"].includes(priority)
    ) {
      filter.priority = priority;
    }

    const tickets = await KitchenTicket.find(filter)
      .populate(
        "stationId",
        "name code targetPreparationMinutes",
      )
      .populate("acceptedBy", "name email")
      .sort({
        status: 1,
        priority: -1,
        createdAt: 1,
      })
      .limit(500)
      .lean();

    return successResponse(tickets);
  } catch (error) {
    return handleApiError(error);
  }
}
