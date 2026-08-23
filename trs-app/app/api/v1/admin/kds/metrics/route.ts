import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { assertDateRange, parseDateParameter } from "@/lib/date-range";
import { KitchenTicket } from "@/models/KitchenTicket";

export async function GET(request: Request) {
  try {
    await requirePermission("kds.manage");
    await connectToDatabase();

    const url = new URL(request.url);
    const from =
      url.searchParams.get("from") ??
      new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
    const to =
      url.searchParams.get("to") ??
      new Date().toISOString();

    const fromDate = parseDateParameter(from, "From date");
    const toDate = parseDateParameter(to, "To date");
    assertDateRange(fromDate, toDate);

    const metrics = await KitchenTicket.aggregate([
      {
        $match: {
          createdAt: {
            $gte: fromDate,
            $lte: toDate,
          },
        },
      },
      {
        $group: {
          _id: "$stationId",
          totalTickets: {
            $sum: 1,
          },
          readyTickets: {
            $sum: {
              $cond: [
                {
                  $in: ["$status", ["ready", "served"]],
                },
                1,
                0,
              ],
            },
          },
          averagePreparationMinutes: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$startedAt", null] },
                    { $ne: ["$readyAt", null] },
                  ],
                },
                {
                  $divide: [
                    {
                      $subtract: [
                        "$readyAt",
                        "$startedAt",
                      ],
                    },
                    60000,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "kitchenstations",
          localField: "_id",
          foreignField: "_id",
          as: "station",
        },
      },
      {
        $unwind: {
          path: "$station",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          stationId: "$_id",
          stationName: "$station.name",
          stationCode: "$station.code",
          totalTickets: 1,
          readyTickets: 1,
          averagePreparationMinutes: {
            $round: ["$averagePreparationMinutes", 2],
          },
        },
      },
      {
        $sort: {
          stationName: 1,
        },
      },
    ]);

    return successResponse(metrics);
  } catch (error) {
    return handleApiError(error);
  }
}
