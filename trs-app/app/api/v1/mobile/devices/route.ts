import { requireMobileCustomer } from "@/lib/auth/mobileSession";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MobileDevice } from "@/models/MobileDevice";
import { revokeMobileDevice, upsertMobileDevice } from "@/services/mobile.service";
import { mobileDeviceSchema } from "@/validators/mobile";

export async function GET(request: Request) {
  try {
    const actor = await requireMobileCustomer(request);
    await connectToDatabase();

    const devices = await MobileDevice.find({
      userId: actor.id,
      revokedAt: null,
    })
      .sort({ lastSeenAt: -1 })
      .lean();

    return successResponse({ devices }, "Mobile devices loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireMobileCustomer(request);
    const input = await validateRequestBody(request, mobileDeviceSchema);
    await connectToDatabase();

    const device = await upsertMobileDevice(actor.id, input);
    return successResponse({ device }, "Mobile device updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireMobileCustomer(request);
    const installationId = new URL(request.url).searchParams.get("installationId");

    await connectToDatabase();
    await revokeMobileDevice(actor.id, installationId ?? undefined);

    return successResponse(null, "Mobile device revoked.");
  } catch (error) {
    return handleApiError(error);
  }
}
