import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryBrand } from "@/models/InventoryBrand";
import { inventoryBrandSchema } from "@/validators/inventoryMasters";

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const active = url.searchParams.get("active");
    const filter: Record<string, unknown> = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { code: { $regex: search, $options: "i" } }];
    if (active === "true" || active === "false") filter.isActive = active === "true";
    const rows = await InventoryBrand.find(filter).sort({ name: 1 }).lean();
    return successResponse(rows);
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = await validateRequestBody(request, inventoryBrandSchema);
    await connectToDatabase();
    const row = await InventoryBrand.create({ ...input, createdBy: actor.id, updatedBy: actor.id });
    return successResponse(row, "Created successfully.", 201);
  } catch (error) { return handleApiError(error); }
}
