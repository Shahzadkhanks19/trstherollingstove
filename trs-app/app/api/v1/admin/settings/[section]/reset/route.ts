import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { resetSetting } from "@/services/settings.service";
import { settingSectionSchema } from "@/validators/settings";

type Context = {
  params: Promise<{ section: string }>;
};

export async function POST(
  _request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "settings.manage",
    );

    const { section } = await context.params;
    const parsedSection =
      settingSectionSchema.safeParse(section);

    if (!parsedSection.success) {
      throw new AppError(
        "Unknown settings section.",
        404,
      );
    }

    await connectToDatabase();

    const setting = await resetSetting(
      parsedSection.data,
      actor.id,
    );

    return successResponse(
      setting,
      "Settings reset to defaults.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
