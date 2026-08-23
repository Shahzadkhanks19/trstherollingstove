import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { MenuItem } from "@/models/MenuItem";
import { POSItem } from "@/models/POSItem";

export async function GET() {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const [menuItems, posItems] = await Promise.all([
      MenuItem.find({ isActive: true, isAvailable: true, deletedAt: null })
        .select("name imageUrl basePrice variants categoryId sortOrder")
        .populate("categoryId", "name")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      POSItem.find({ isActive: true }).sort({ category: 1, sortOrder: 1, name: 1 }).lean(),
    ]);
    return successResponse({
      menuItems: menuItems.map((item) => ({
        id: String(item._id), sourceType: "menu", name: item.name, imageUrl: item.imageUrl,
        category: String((item.categoryId as unknown as { name?: string } | null)?.name ?? "Menu"),
        price: item.basePrice,
        variants: item.variants.filter((variant) => variant.isActive).map((variant) => ({ id: String(variant._id), name: variant.name, price: variant.price })),
      })),
      posItems: posItems.map((item) => ({
        id: String(item._id), sourceType: "pos", name: item.name, imageUrl: item.imageUrl,
        category: item.category, price: item.sellingPrice, allowCustomPrice: item.allowCustomPrice,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
