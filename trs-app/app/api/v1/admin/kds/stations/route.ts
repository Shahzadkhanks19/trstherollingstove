import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { KitchenStation } from "@/models/KitchenStation";
import { createKitchenStationSchema } from "@/validators/kds";

export async function GET() {
  try {
    await requirePermission("kds.use");
    await connectToDatabase();

    const stations = await KitchenStation.find()
      .sort({ isActive: -1, sortOrder: 1, name: 1 })
      .lean();

    return successResponse(stations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("kds.manage");
    const input = await validateRequestBody(
      request,
      createKitchenStationSchema,
    );

    await connectToDatabase();

    const station = await KitchenStation.create({
      ...input,
      code: input.code.toUpperCase(),
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(
      station,
      "Kitchen station created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
