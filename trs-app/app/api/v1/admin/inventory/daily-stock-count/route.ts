import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryItem } from "@/models/InventoryItem";
import { StockCount } from "@/models/StockCount";
import { createStockCount } from "@/services/inventoryOperations.service";
import { createStockCountSchema } from "@/validators/inventoryOperations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();
    const url = new URL(request.url);
    const historyLimit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const [items, history] = await Promise.all([
      InventoryItem.find({ isActive: true }).sort({ category: 1, name: 1 }).lean(),
      StockCount.find().populate("createdBy", "name email").populate("postedBy", "name email").sort({ countedAt: -1 }).limit(historyLimit).lean(),
    ]);

    return successResponse({ items, history });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("inventory.manage");
    const input = await validateRequestBody(request, createStockCountSchema);
    await connectToDatabase();
    const count = await createStockCount({ ...input, actorId: actor.id });
    return successResponse(count, "Daily stock count saved as draft.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
