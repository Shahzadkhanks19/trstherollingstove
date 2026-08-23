import { requireMobileCustomer } from "@/lib/auth/mobileSession";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getMobileBootstrap } from "@/services/mobile.service";

export async function GET(request: Request) {
  try {
    const actor = await requireMobileCustomer(request);
    await connectToDatabase();

    return successResponse(
      await getMobileBootstrap(actor.id),
      "Mobile bootstrap loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
