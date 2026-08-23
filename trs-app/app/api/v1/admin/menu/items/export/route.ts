import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { MenuItem } from "@/models/MenuItem";
import { createMenuCsv } from "@/utils/menuCsv";

export async function GET() {
  try {
    await requirePermission("menu.read");
    await connectToDatabase();

    const items = await MenuItem.find({ deletedAt: null })
      .populate("categoryId", "name")
      .populate("taxClassId", "code percentage")
      .sort({ sortOrder: 1, name: 1 })
      .limit(10_000)
      .lean();

    const csv = createMenuCsv(
      [
        "Name",
        "Slug",
        "Category",
        "Base Price",
        "Active",
        "Available",
        "Featured",
        "Bestseller",
        "Dine In",
        "Takeaway",
        "Preparation Minutes",
        "Tax",
        "Tags",
      ],
      items.map((item) => {
        const category = item.categoryId as unknown as { name?: string };
        const taxClass = item.taxClassId as unknown as { code?: string; percentage?: number } | null;
        return [
          item.name,
          item.slug,
          category?.name ?? "",
          item.basePrice,
          item.isActive,
          item.isAvailable,
          item.isFeatured,
          item.isBestseller,
          item.availableForDineIn,
          item.availableForTakeaway,
          item.preparationTimeMinutes,
          taxClass ? `${taxClass.code ?? ""} ${taxClass.percentage ?? 0}%` : "",
          (item.tags ?? []).join("|"),
        ];
      }),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trs-menu-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
