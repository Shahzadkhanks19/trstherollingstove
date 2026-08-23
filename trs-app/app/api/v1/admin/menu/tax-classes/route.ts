import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { TaxClass } from "@/models/TaxClass";
import { writeAuditLog } from "@/services/audit.service";
import { taxClassCreateSchema } from "@/validators/menu";

export async function GET() {
  try {
    await requirePermission("menu.read");
    await connectToDatabase();
    return successResponse(await TaxClass.find().sort({ name: 1 }).lean(), "Tax classes loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("menu.create");
    const input = await validateRequestBody(request, taxClassCreateSchema);
    await connectToDatabase();

    if (await TaxClass.exists({ code: input.code })) {
      throw new AppError("A tax class with this code already exists.", 409);
    }

    const taxClass = await TaxClass.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.tax_class_created",
      entityType: "tax_class",
      entityId: taxClass.id,
      description: `Tax class ${taxClass.code} created.`,
    });

    return successResponse(taxClass, "Tax class created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
