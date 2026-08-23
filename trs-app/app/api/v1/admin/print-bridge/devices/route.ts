import { generateOpaqueToken, hashOpaqueToken } from "@/lib/auth/randomToken";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { PrintBridgeDevice } from "@/models/PrintBridgeDevice";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();
    const devices = await PrintBridgeDevice.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(devices);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("settings.manage");
    const body = await request.json() as { name?: string };
    const name = body.name?.trim() ?? "";
    if (name.length < 2 || name.length > 120) {
      throw new AppError("Device name must be between 2 and 120 characters.", 400);
    }

    await connectToDatabase();
    const rawToken = generateOpaqueToken(48);
    const device = await PrintBridgeDevice.create({
      name,
      tokenHash: hashOpaqueToken(rawToken),
      createdBy: actor.id,
    });

    return successResponse({
      device: {
        _id: String(device._id),
        name: device.name,
        platform: device.platform,
        isActive: device.isActive,
      },
      token: rawToken,
    }, "Print bridge device registered. Save the token now; it will not be shown again.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
