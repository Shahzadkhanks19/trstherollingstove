import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { MenuCategory } from "@/models/MenuCategory";
import { writeAuditLog } from "@/services/audit.service";
import { Types } from "mongoose";

const TRS_CATEGORIES = [
  { name: "Pizza", slug: "pizza", description: "Freshly baked pizzas with classic and TRS signature toppings.", sortOrder: 1, isFeatured: true },
  { name: "Pasta", slug: "pasta", description: "Creamy, spicy and signature pasta preparations.", sortOrder: 2, isFeatured: true },
  { name: "Chur Chur Naan", slug: "chur-chur-naan", description: "Crispy layered naan platters served in half and full portions.", sortOrder: 3, isFeatured: true },
  { name: "Garlic Bread", slug: "garlic-bread", description: "Toasted garlic breads and cheesy garlic bread favourites.", sortOrder: 4, isFeatured: false },
  { name: "French Fries", slug: "french-fries", description: "Classic, loaded and TRS special fries.", sortOrder: 5, isFeatured: true },
  { name: "Brownies", slug: "brownies", description: "Warm, rich brownies and dessert combinations.", sortOrder: 6, isFeatured: false },
  { name: "Mocktails", slug: "mocktails", description: "Refreshing non-alcoholic coolers and signature mocktails.", sortOrder: 7, isFeatured: true },
  { name: "Combos", slug: "combos", description: "Curated multi-item value combos built from active menu products.", sortOrder: 8, isFeatured: true },
] as const;

export async function POST() {
  try {
    const actor = await requirePermission("menu.create");
    await connectToDatabase();

    let created = 0;
    let restored = 0;
    let existing = 0;

    for (const category of TRS_CATEGORIES) {
      const current = await MenuCategory.findOne({ slug: category.slug });
      if (!current) {
        await MenuCategory.create({
          ...category,
          imageUrl: "",
          iconUrl: "",
          isActive: true,
          deletedAt: null,
          createdBy: actor.id,
          updatedBy: actor.id,
        });
        created += 1;
        continue;
      }

      if (current.deletedAt || !current.isActive) {
        current.name = category.name;
        current.description = category.description;
        current.sortOrder = category.sortOrder;
        current.isFeatured = category.isFeatured;
        current.isActive = true;
        current.deletedAt = null;
        current.updatedBy = new Types.ObjectId(actor.id);
        await current.save();
        restored += 1;
      } else {
        existing += 1;
      }
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.default_categories_installed",
      entityType: "menu_category",
      description: `TRS categories installed. Created ${created}, restored ${restored}, existing ${existing}.`,
      metadata: { created, restored, existing, categorySlugs: TRS_CATEGORIES.map((category) => category.slug) },
    });

    return successResponse(
      { created, restored, existing, total: TRS_CATEGORIES.length },
      created || restored ? "TRS categories added successfully." : "All TRS categories already exist.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
