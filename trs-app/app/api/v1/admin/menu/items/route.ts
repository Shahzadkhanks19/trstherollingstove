import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { revalidatePublicMenuPaths } from "@/lib/menu-cache";
import { MenuCategory } from "@/models/MenuCategory";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { TaxClass } from "@/models/TaxClass";
import { writeAuditLog } from "@/services/audit.service";
import { publishMenuUpdated } from "@/services/realtimeEvents.service";
import { getPagination } from "@/utils/pagination";
import { createSlug } from "@/utils/slug";
import { menuItemCreateSchema } from "@/validators/menu";
import { resolveComboComponents } from "@/services/combo.service";

export async function GET(request: Request) {
  try {
    await requirePermission("menu.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const { page, limit, skip } = getPagination(url.searchParams);
    const filter: Record<string, unknown> = { deletedAt: null };

    const search = url.searchParams.get("search")?.trim();
    const categoryId = url.searchParams.get("categoryId");
    const isActive = url.searchParams.get("isActive");
    const isAvailable = url.searchParams.get("isAvailable");
    const featured = url.searchParams.get("featured");
    const bestseller = url.searchParams.get("bestseller");

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    if (categoryId) filter.categoryId = categoryId;
    if (isActive === "true" || isActive === "false") filter.isActive = isActive === "true";
    if (isAvailable === "true" || isAvailable === "false") filter.isAvailable = isAvailable === "true";
    if (featured === "true" || featured === "false") filter.isFeatured = featured === "true";
    if (bestseller === "true" || bestseller === "false") filter.isBestseller = bestseller === "true";

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate({ path: "categoryId", model: MenuCategory, select: "name slug" })
        .populate("taxClassId", "name code percentage isInclusive")
        .populate({ path: "modifierGroupIds", model: ModifierGroup })
        .populate({ path: "frequentlyOrderedWithIds", model: MenuItem, select: "name slug imageUrl basePrice variants isAvailable isActive deletedAt" })
        .populate({ path: "comboComponents.menuItemId", model: MenuItem, select: "name slug basePrice variants isActive isAvailable deletedAt" })
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    return successResponse(items, "Menu items loaded.", 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("menu.create");
    const input = await validateRequestBody(request, menuItemCreateSchema);
    await connectToDatabase();

    const category = await MenuCategory.findOne({ _id: input.categoryId, deletedAt: null, isActive: true });
    if (!category) throw new AppError("Select a valid active category.", 400);

    if (input.taxClassId && !(await TaxClass.exists({ _id: input.taxClassId, isActive: true }))) {
      throw new AppError("Select a valid active tax class.", 400);
    }

    const modifierCount = await ModifierGroup.countDocuments({
      _id: { $in: input.modifierGroupIds },
      isActive: true,
    });
    if (modifierCount !== input.modifierGroupIds.length) {
      throw new AppError("One or more modifier groups are invalid or inactive.", 400);
    }

    const requestedFrequentlyOrderedIds = [...new Set(input.frequentlyOrderedWithIds)];
    const validFrequentlyOrderedItems = requestedFrequentlyOrderedIds.length
      ? await MenuItem.find({
          _id: { $in: requestedFrequentlyOrderedIds },
          deletedAt: null,
          isActive: true,
        }).select("_id").lean()
      : [];
    const validFrequentlyOrderedIdSet = new Set(
      validFrequentlyOrderedItems.map((related) => related._id.toString()),
    );
    const validFrequentlyOrderedWithIds = requestedFrequentlyOrderedIds.filter(
      (relatedId) => validFrequentlyOrderedIdSet.has(relatedId),
    );

    const slug = createSlug(input.slug || input.name);
    if (!slug) throw new AppError("Unable to generate menu item slug.", 400);

    const todaysSpecialOfferStartsAt =
      input.isTodaysSpecialOffer && input.todaysSpecialOfferStartsAt
        ? new Date(input.todaysSpecialOfferStartsAt)
        : null;
    const todaysSpecialOfferExpiresAt = todaysSpecialOfferStartsAt
      ? new Date(todaysSpecialOfferStartsAt.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const categoryIsCombo = category.slug === "combos";
    const comboPricing = categoryIsCombo
      ? await resolveComboComponents(input.comboComponents, input.basePrice)
      : null;
    const comboOfferStartsAt = categoryIsCombo && input.comboOfferStartsAt ? new Date(input.comboOfferStartsAt) : null;
    const comboOfferExpiresAt = categoryIsCombo
      ? input.comboOffersPageSection === "todays" && comboOfferStartsAt
        ? new Date(comboOfferStartsAt.getTime() + 24 * 60 * 60 * 1000)
        : input.comboOfferType === "limited" && input.comboOfferExpiresAt
          ? new Date(input.comboOfferExpiresAt)
          : null
      : null;

    const normalizedInput = {
      ...input,
      slug,
      isCombo: categoryIsCombo,
      comboComponents: comboPricing?.components ?? [],
      comboOriginalPrice: comboPricing?.originalPrice ?? null,
      comboSavings: comboPricing?.savings ?? null,
      comboDiscountPercent: comboPricing?.discountPercent ?? null,
      compareAtPrice: comboPricing?.originalPrice ?? input.compareAtPrice,
      comboOfferStartsAt,
      comboOfferExpiresAt,
      todaysSpecialOfferStartsAt,
      todaysSpecialOfferExpiresAt,
      allergens: input.allergens.map((value) => value.toLowerCase()),
      tags: input.tags.map((value) => value.toLowerCase()),
      frequentlyOrderedWithIds: validFrequentlyOrderedWithIds,
      updatedBy: actor.id,
    };

    const existingItem = await MenuItem.findOne({ slug });
    if (existingItem && existingItem.deletedAt === null) {
      throw new AppError("A menu item with this slug already exists.", 409);
    }

    const item = existingItem
      ? await MenuItem.findByIdAndUpdate(
          existingItem._id,
          {
            $set: {
              ...normalizedInput,
              deletedAt: null,
            },
          },
          { new: true, runValidators: true },
        )
      : await MenuItem.create({
          ...normalizedInput,
          createdBy: actor.id,
        });

    if (!item) {
      throw new AppError("Unable to save the menu item.", 500);
    }

    const restored = Boolean(existingItem);

    await writeAuditLog({
      actorUserId: actor.id,
      action: restored ? "menu.item_restored" : "menu.item_created",
      entityType: "menu_item",
      entityId: item.id,
      description: restored
        ? `Menu item ${item.name} restored and updated.`
        : `Menu item ${item.name} created.`,
    });

    publishMenuUpdated({ action: restored ? "updated" : "created", itemId: item.id, actorId: actor.id });
    revalidatePublicMenuPaths([item.slug]);

    return successResponse(
      item,
      restored ? "Deleted menu item restored and updated." : "Menu item created.",
      restored ? 200 : 201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
