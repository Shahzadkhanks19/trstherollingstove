import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { PickupPerson } from "@/models/PickupPerson";
import { createPickupPersonSchema } from "@/validators/purchases";

export async function GET(request: Request) {
  try {
    await requirePermission("purchases.read");
    await connectToDatabase();
    const active = new URL(request.url).searchParams.get("active");
    const filter = active === "true" ? { isActive: true } : {};
    return successResponse(await PickupPerson.find(filter).sort({ name: 1 }).lean());
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("purchases.manage");
    const input = await validateRequestBody(request, createPickupPersonSchema);
    await connectToDatabase();
    const person = await PickupPerson.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    return successResponse(person, "Pickup person created.", 201);
  } catch (error) { return handleApiError(error); }
}
