import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { BackgroundJob } from "@/models/BackgroundJob";
import { enqueueJob } from "@/services/jobQueue.service";
import { enqueueJobSchema, jobQuerySchema } from "@/validators/jobs";

export async function GET(request: Request) {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();

    const url = new URL(request.url);
    const parsed = jobQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    // Use a plain object to avoid Mongoose generic incompatibilities.
    const filter: Record<string, unknown> = {};

    if (parsed.key) filter.key = parsed.key;
    if (parsed.status) filter.status = parsed.status;

    if (parsed.search) {
      const regex = {
        $regex: parsed.search,
        $options: "i",
      };

      filter.$or = [
        { deduplicationKey: regex },
        { lastError: regex },
      ];
    }

    const skip = (parsed.page - 1) * parsed.limit;

    const [items, total] = await Promise.all([
      BackgroundJob.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
      BackgroundJob.countDocuments(filter),
    ]);

    return successResponse({
      items,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages: Math.ceil(total / parsed.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");

    const input = await validateRequestBody(
      request,
      enqueueJobSchema,
    );

    await connectToDatabase();

    const result = await enqueueJob({
      ...input,
      createdBy: actor.id,
    });

    return successResponse(
      result,
      result.created
        ? "Background job queued."
        : "Existing queued job returned.",
      result.created ? 201 : 200,
    );
  } catch (error) {
    return handleApiError(error);
  }
}