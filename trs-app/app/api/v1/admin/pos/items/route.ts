import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { POSItem } from "@/models/POSItem";
import { createPosItemSchema } from "@/validators/pos";

export async function GET() {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    return successResponse(await POSItem.find().sort({ category: 1, sortOrder: 1, name: 1 }).lean());
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.manage");
    const input = await validateRequestBody(request, createPosItemSchema);
    await connectToDatabase();
    const item = await POSItem.create({
      name: input.name,
      sku: `POS-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      category: "Counter",
      description: "",
      imageUrl: "",
      sellingPrice: input.sellingPrice,
      taxRate: 0,
      trackInventory: false,
      inventoryItemId: null,
      sendToKds: true,
      kitchenStationId: null,
      allowCustomPrice: false,
      isActive: true,
      sortOrder: 0,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return successResponse(item, "POS-only item created.", 201);
  } catch (error) { return handleApiError(error); }
}
