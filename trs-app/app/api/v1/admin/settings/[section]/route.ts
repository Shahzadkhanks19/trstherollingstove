import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import {
  getSetting,
  updateSetting,
} from "@/services/settings.service";
import { settingSectionSchema, updateSettingRequestSchema } from "@/validators/settings";

type Context = {
  params: Promise<{ section: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("settings.manage");

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

    return successResponse(
      await getSetting(parsedSection.data),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
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

    const input = await validateRequestBody(
      request,
      updateSettingRequestSchema,
    );

    await connectToDatabase();

    const setting = await updateSetting({
      section: parsedSection.data,
      data: input.data,
      expectedRevision:
        input.expectedRevision,
      actorId: actor.id,
    });

    return successResponse(
      setting,
      "Settings updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
