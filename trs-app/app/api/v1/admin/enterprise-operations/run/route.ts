import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { buildEnterpriseHealthSnapshot } from "@/services/enterprise-operations.service";
import { enterpriseHealthRunSchema } from "@/validators/enterprise-operations";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("settings.manage");

    await connectToDatabase();

    enterpriseHealthRunSchema.parse(
      await request.json().catch(() => ({})),
    );

    const snapshot = await buildEnterpriseHealthSnapshot(
      "manual",
      user.id,
    );

    return successResponse(
      snapshot,
      "Enterprise health assessment completed.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}