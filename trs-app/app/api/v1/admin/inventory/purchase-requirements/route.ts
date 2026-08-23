import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InventoryItem } from "@/models/InventoryItem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requirePermission("inventory.read");
    await connectToDatabase();
    const items = await InventoryItem.find({ isActive: true }).sort({ category: 1, name: 1 }).lean();
    const requirements = items.map((item) => {
      const target = Math.max(item.idealStockLevel ?? 0, item.reorderLevel ?? 0);
      const suggestedQuantity = Math.max(0, Number((target - item.currentStock).toFixed(3)));
      const belowReorder = item.currentStock <= item.reorderLevel;
      const priority = item.currentStock <= 0 ? "critical" : belowReorder ? "high" : suggestedQuantity > 0 ? "medium" : "sufficient";
      return { id: String(item._id), name: item.name, sku: item.sku, category: item.category, unit: item.unit, currentStock: item.currentStock, reorderLevel: item.reorderLevel, targetStock: target, suggestedQuantity, estimatedValue: Number((suggestedQuantity * item.averageUnitCost).toFixed(2)), averageUnitCost: item.averageUnitCost, priority };
    });
    return successResponse({ requirements, summary: { totalItems: requirements.length, requiringPurchase: requirements.filter((row) => row.suggestedQuantity > 0).length, critical: requirements.filter((row) => row.priority === "critical").length, estimatedValue: Number(requirements.reduce((sum, row) => sum + row.estimatedValue, 0).toFixed(2)) } });
  } catch (error) { return handleApiError(error); }
}
