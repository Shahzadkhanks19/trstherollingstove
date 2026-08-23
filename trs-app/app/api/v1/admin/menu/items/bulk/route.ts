import type { AnyBulkWriteOperation, Document } from "mongodb";
import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { revalidatePublicMenuPaths } from "@/lib/menu-cache";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { MenuItem } from "@/models/MenuItem";
import { writeAuditLog } from "@/services/audit.service";
import { publishMenuUpdated } from "@/services/realtimeEvents.service";
import { menuBulkActionSchema } from "@/validators/menu";

const actionUpdates = {
  activate: { isActive: true },
  deactivate: { isActive: false },
  mark_available: { isAvailable: true },
  mark_unavailable: { isAvailable: false },
  feature: { isFeatured: true },
  unfeature: { isFeatured: false },
  mark_bestseller: { isBestseller: true },
  remove_bestseller: { isBestseller: false },
} as const;

type StandardBulkAction = keyof typeof actionUpdates;
type DiscountType = "percentage" | "fixed";

type VariantPrice = {
  _id?: Types.ObjectId;
  name: string;
  sku?: string;
  price: number;
  compareAtPrice?: number | null;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateDiscountedPrice(
  originalPrice: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  const discountedPrice =
    discountType === "percentage"
      ? originalPrice * (1 - discountValue / 100)
      : originalPrice - discountValue;

  const rounded = roundMoney(discountedPrice);
  if (rounded <= 0 || rounded >= originalPrice) {
    throw new AppError(
      `The selected discount is invalid for an item priced at ₹${originalPrice.toFixed(2)}. The final selling price must remain above ₹0 and below the original price.`,
      400,
    );
  }
  return rounded;
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("menu.update");
    const input = await validateRequestBody(request, menuBulkActionSchema);
    await connectToDatabase();

    if (input.action in actionUpdates) {
      const action = input.action as StandardBulkAction;
      const result = await MenuItem.updateMany(
        { _id: { $in: input.itemIds }, deletedAt: null },
        { $set: { ...actionUpdates[action], updatedBy: actor.id } },
      );

      await writeAuditLog({
        actorUserId: actor.id,
        action: `menu.items_bulk_${action}`,
        entityType: "menu_item",
        description: `${result.modifiedCount} menu items updated.`,
        metadata: { itemIds: input.itemIds },
      });

      publishMenuUpdated({ action: "updated", actorId: actor.id });
      revalidatePublicMenuPaths();

      return successResponse(
        { matched: result.matchedCount, modified: result.modifiedCount },
        "Bulk action completed.",
      );
    }

    const items = await MenuItem.find({
      _id: { $in: input.itemIds },
      deletedAt: null,
    })
      .select("name basePrice compareAtPrice variants isCombo")
      .lean();

    if (items.length !== input.itemIds.length) {
      throw new AppError("One or more selected menu items no longer exist.", 400);
    }
    if (items.some((item) => item.isCombo)) {
      throw new AppError(
        "Bulk menu-item discounts cannot be applied to combos. Combo pricing is managed in the Combo Builder.",
        400,
      );
    }

    const updatedBy = new Types.ObjectId(actor.id);
    const operations: AnyBulkWriteOperation<Document>[] = items.map((item) => {
      if (input.action === "remove_discount") {
        const variants = (item.variants as VariantPrice[]).map((variant) => ({
          ...variant,
          price: Number(variant.compareAtPrice ?? variant.price),
          compareAtPrice: null,
        }));
        const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
        const restoredBasePrice = defaultVariant
          ? Number(defaultVariant.price)
          : Number(item.compareAtPrice ?? item.basePrice);

        return {
          updateOne: {
            filter: { _id: item._id, deletedAt: null },
            update: {
              $set: {
                basePrice: roundMoney(restoredBasePrice),
                compareAtPrice: null,
                variants,
                updatedBy,
              },
            },
          },
        };
      }

      const discountType = input.discountType as DiscountType;
      const discountValue = input.discountValue as number;
      const variants = item.variants as VariantPrice[];

      if (variants.length > 0) {
        const discountedVariants = variants.map((variant) => {
          const originalPrice = Number(variant.compareAtPrice ?? variant.price);
          return {
            ...variant,
            price: calculateDiscountedPrice(originalPrice, discountType, discountValue),
            compareAtPrice: roundMoney(originalPrice),
          };
        });
        const defaultVariant =
          discountedVariants.find((variant) => variant.isDefault) ?? discountedVariants[0];

        return {
          updateOne: {
            filter: { _id: item._id, deletedAt: null },
            update: {
              $set: {
                basePrice: defaultVariant.price,
                compareAtPrice: defaultVariant.compareAtPrice,
                variants: discountedVariants,
                updatedBy,
              },
            },
          },
        };
      }

      const originalPrice = Number(item.compareAtPrice ?? item.basePrice);
      return {
        updateOne: {
          filter: { _id: item._id, deletedAt: null },
          update: {
            $set: {
              basePrice: calculateDiscountedPrice(originalPrice, discountType, discountValue),
              compareAtPrice: roundMoney(originalPrice),
              updatedBy,
            },
          },
        },
      };
    });

    const result = await MenuItem.collection.bulkWrite(operations, { ordered: true });
    const actionLabel = input.action === "remove_discount" ? "removed discounts from" : "applied discounts to";

    await writeAuditLog({
      actorUserId: actor.id,
      action: `menu.items_bulk_${input.action}`,
      entityType: "menu_item",
      description: `Successfully ${actionLabel} ${result.modifiedCount} menu items.`,
      metadata: {
        itemIds: input.itemIds,
        discountType: input.discountType,
        discountValue: input.discountValue,
      },
    });

    publishMenuUpdated({ action: "updated", actorId: actor.id });
    revalidatePublicMenuPaths();

    return successResponse(
      { matched: items.length, modified: result.modifiedCount },
      input.action === "remove_discount"
        ? `Discount removed from ${result.modifiedCount} menu items.`
        : `Discount applied to ${result.modifiedCount} menu items.`,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
