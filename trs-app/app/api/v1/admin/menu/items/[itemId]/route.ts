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
import { createSlug } from "@/utils/slug";
import { menuItemUpdateSchema } from "@/validators/menu";
import { Types } from "mongoose";
import { resolveComboComponents } from "@/services/combo.service";

async function validateCombinationPricing(input: { enabled: boolean; modifierGroupId: string | null; entries: Array<{ variantLabel: string; optionId: string; optionName: string; price: number }> } | undefined, modifierGroupIds: string[] | undefined) {
  if (!input?.enabled) return;
  if (!input.modifierGroupId || !modifierGroupIds?.includes(input.modifierGroupId)) throw new AppError("The combination-pricing group must be attached to the item.", 400);
  const group = await ModifierGroup.findOne({ _id: input.modifierGroupId, isActive: true }).lean();
  if (!group) throw new AppError("Select a valid active combination-pricing group.", 400);
  const activeOptionIds = new Set((group.options ?? []).filter((option) => option.isActive && option.isAvailable !== false).map((option) => option._id?.toString()).filter((value): value is string => Boolean(value)));
  if (input.entries.some((entry) => !activeOptionIds.has(entry.optionId))) throw new AppError("One or more combination prices reference an unavailable option.", 400);
  const keys = input.entries.map((entry) => `${entry.variantLabel.trim().toLowerCase()}::${entry.optionId}`);
  if (new Set(keys).size !== keys.length) throw new AppError("Duplicate platter combination prices are not allowed.", 400);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    await requirePermission("menu.read");
    const { itemId } = await context.params;
    await connectToDatabase();

    const item = await MenuItem.findOne({ _id: itemId, deletedAt: null })
      .populate({ path: "categoryId", model: MenuCategory, select: "name slug" })
      .populate("taxClassId", "name code percentage isInclusive")
      .populate({ path: "modifierGroupIds", model: ModifierGroup })
      .populate({ path: "frequentlyOrderedWithIds", model: MenuItem, select: "name slug imageUrl basePrice variants isAvailable isActive deletedAt" })
      .populate({ path: "comboComponents.menuItemId", model: MenuItem, select: "name slug basePrice variants isActive isAvailable deletedAt" })
      .lean();

    if (!item) throw new AppError("Menu item not found.", 404);
    return successResponse(item, "Menu item loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const actor = await requirePermission("menu.update");
    const { itemId } = await context.params;
    const input = await validateRequestBody(request, menuItemUpdateSchema);
    await connectToDatabase();

    const item = await MenuItem.findOne({ _id: itemId, deletedAt: null });
    if (!item) throw new AppError("Menu item not found.", 404);
    const previousSlug = item.slug;

    if (input.categoryId) {
      const category = await MenuCategory.exists({ _id: input.categoryId, deletedAt: null, isActive: true });
      if (!category) throw new AppError("Select a valid active category.", 400);
    }

    if (input.taxClassId && !(await TaxClass.exists({ _id: input.taxClassId, isActive: true }))) {
      throw new AppError("Select a valid active tax class.", 400);
    }

    if (input.modifierGroupIds) {
      const modifierCount = await ModifierGroup.countDocuments({
        _id: { $in: input.modifierGroupIds },
        isActive: true,
      });
      if (modifierCount !== input.modifierGroupIds.length) {
        throw new AppError("One or more modifier groups are invalid or inactive.", 400);
      }
    }

    await validateCombinationPricing(input.combinationPricing, input.modifierGroupIds ?? (item.modifierGroupIds ?? []).map((id) => id.toString()));

    let validFrequentlyOrderedWithIds: string[] | undefined;
    if (input.frequentlyOrderedWithIds) {
      const requestedIds = [...new Set(input.frequentlyOrderedWithIds)]
        .filter((relatedId) => relatedId !== itemId);
      const validRelatedItems = await MenuItem.find({
        _id: { $in: requestedIds },
        deletedAt: null,
        isActive: true,
      }).select("_id").lean();
      const validIdSet = new Set(validRelatedItems.map((related) => related._id.toString()));
      validFrequentlyOrderedWithIds = requestedIds.filter((relatedId) => validIdSet.has(relatedId));
    }

    if (input.slug || input.name) {
      const slug = createSlug(input.slug || input.name || item.name);
      const duplicate = await MenuItem.exists({ slug, _id: { $ne: item._id } });
      if (duplicate) throw new AppError("A menu item with this slug already exists.", 409);
      item.slug = slug;
    }

    const nextIsTodaysSpecialOffer =
      input.isTodaysSpecialOffer ?? item.isTodaysSpecialOffer;
    const nextSpecialStartsAt =
      input.todaysSpecialOfferStartsAt !== undefined
        ? input.todaysSpecialOfferStartsAt
          ? new Date(input.todaysSpecialOfferStartsAt)
          : null
        : item.todaysSpecialOfferStartsAt;
    const nextSpecialExpiresAt =
      nextIsTodaysSpecialOffer && nextSpecialStartsAt
        ? new Date(nextSpecialStartsAt.getTime() + 24 * 60 * 60 * 1000)
        : null;

    const targetCategoryId = input.categoryId ?? item.categoryId.toString();
    const targetCategory = await MenuCategory.findOne({ _id: targetCategoryId, deletedAt: null, isActive: true }).lean();
    if (!targetCategory) throw new AppError("Select a valid active category.", 400);
    const nextIsCombo = targetCategory.slug === "combos";
    const comboPricing = nextIsCombo
      ? await resolveComboComponents(
          input.comboComponents ?? (item.comboComponents ?? []).map((entry) => ({ menuItemId: entry.menuItemId.toString(), variantId: entry.variantId?.toString() ?? null, quantity: entry.quantity })),
          input.basePrice ?? item.basePrice,
          itemId,
        )
      : null;
    const nextComboSection = input.comboOffersPageSection ?? item.comboOffersPageSection;
    const nextComboType = input.comboOfferType ?? item.comboOfferType;
    const nextComboStartsAt = input.comboOfferStartsAt !== undefined
      ? input.comboOfferStartsAt ? new Date(input.comboOfferStartsAt) : null
      : item.comboOfferStartsAt;
    const nextComboExpiresAt = !nextIsCombo
      ? null
      : nextComboSection === "todays" && nextComboStartsAt
        ? new Date(nextComboStartsAt.getTime() + 24 * 60 * 60 * 1000)
        : nextComboType === "limited"
          ? (input.comboOfferExpiresAt !== undefined
              ? input.comboOfferExpiresAt ? new Date(input.comboOfferExpiresAt) : null
              : item.comboOfferExpiresAt)
          : null;

    Object.assign(item, {
      ...input,
      slug: item.slug,
      isCombo: nextIsCombo,
      comboComponents: comboPricing?.components ?? [],
      comboOriginalPrice: comboPricing?.originalPrice ?? null,
      comboSavings: comboPricing?.savings ?? null,
      comboDiscountPercent: comboPricing?.discountPercent ?? null,
      compareAtPrice: comboPricing?.originalPrice ?? (input.compareAtPrice ?? item.compareAtPrice),
      comboOfferStartsAt: nextIsCombo ? nextComboStartsAt : null,
      comboOfferExpiresAt: nextComboExpiresAt,
      isTodaysSpecialOffer: nextIsTodaysSpecialOffer,
      todaysSpecialOfferStartsAt: nextIsTodaysSpecialOffer ? nextSpecialStartsAt : null,
      todaysSpecialOfferExpiresAt: nextSpecialExpiresAt,
      allergens: input.allergens?.map((value) => value.toLowerCase()) ?? item.allergens,
      tags: input.tags?.map((value) => value.toLowerCase()) ?? item.tags,
      frequentlyOrderedWithIds:
        validFrequentlyOrderedWithIds ?? item.frequentlyOrderedWithIds,
      updatedBy: actor.id,
    });
    await item.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.item_updated",
      entityType: "menu_item",
      entityId: item.id,
      description: `Menu item ${item.name} updated.`,
    });

    publishMenuUpdated({ action: "updated", itemId: item.id, actorId: actor.id });
    revalidatePublicMenuPaths([previousSlug, item.slug]);

    return successResponse(item, "Menu item updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const actor = await requirePermission("menu.delete");
    const { itemId } = await context.params;
    await connectToDatabase();

    const item = await MenuItem.findOne({ _id: itemId, deletedAt: null });
    if (!item) throw new AppError("Menu item not found.", 404);

    item.deletedAt = new Date();
    item.isActive = false;
    item.isAvailable = false;
    item.updatedBy = new Types.ObjectId(actor.id);
    await item.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "menu.item_deleted",
      entityType: "menu_item",
      entityId: item.id,
      description: `Menu item ${item.name} deleted.`,
    });

    publishMenuUpdated({ action: "deleted", itemId: item.id, actorId: actor.id });
    revalidatePublicMenuPaths([item.slug]);

    return successResponse(null, "Menu item deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
