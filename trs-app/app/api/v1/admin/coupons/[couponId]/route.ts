import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { buildArchivedCouponCode, Coupon } from "@/models/Coupon";
import { MenuItem } from "@/models/MenuItem";
import { writeAuditLog } from "@/services/audit.service";
import { couponUpdateSchema } from "@/validators/rewards";

type Context = { params: Promise<{ couponId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission("orders.read");
    const { couponId } = await context.params;
    await connectToDatabase();

    const coupon = await Coupon.findOne({ _id: couponId, deletedAt: null }).lean();
    if (!coupon) throw new AppError("Coupon not found.", 404);

    return successResponse(coupon, "Coupon loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("orders.manage");
    const { couponId } = await context.params;
    const input = await validateRequestBody(request, couponUpdateSchema);
    await connectToDatabase();

    const coupon = await Coupon.findOne({ _id: couponId, deletedAt: null });
    if (!coupon) throw new AppError("Coupon not found.", 404);

    if (input.discountType === "free_item" || coupon.discountType === "free_item") {
      const nextDiscountType = input.discountType ?? coupon.discountType;
      const nextFreeMenuItemId =
        input.freeMenuItemId === undefined ? coupon.freeMenuItemId : input.freeMenuItemId;

      if (nextDiscountType === "free_item") {
        const freeItemExists = await MenuItem.exists({
          _id: nextFreeMenuItemId,
          isActive: true,
          isAvailable: true,
          deletedAt: null,
        });

        if (!freeItemExists) {
          throw new AppError("Select a valid active and available free item.", 400);
        }
      }
    }

    const update: Record<string, unknown> = {
      ...input,
      updatedBy: new Types.ObjectId(actor.id),
    };

    if (input.startsAt !== undefined) update.startsAt = new Date(input.startsAt);
    if (input.expiresAt !== undefined) update.expiresAt = new Date(input.expiresAt);

    const nextDiscountType = input.discountType ?? coupon.discountType;
    const nextDiscountValue =
      nextDiscountType === "free_item"
        ? 0
        : input.discountValue ?? coupon.discountValue;

    if (nextDiscountType === "free_item") {
      update.discountValue = 0;
    } else {
      if (nextDiscountValue <= 0) {
        throw new AppError("Discount value must be greater than 0.", 400);
      }
      if (nextDiscountType === "percentage" && nextDiscountValue > 100) {
        throw new AppError("Percentage discount cannot exceed 100.", 400);
      }
      if (input.discountType !== undefined) update.freeMenuItemId = null;
    }

    /*
     * Use an atomic update instead of Object.assign(document, input). This ensures
     * newly introduced fields such as couponChannel are persisted for existing
     * records and not silently lost by a stale hydrated document instance.
     */
    const updatedCoupon = await Coupon.findOneAndUpdate(
      { _id: couponId, deletedAt: null },
      { $set: update },
      // Request validation and the combined-state checks above are used here.
      // Mongoose update validators do not expose discountType through the same
      // document context as discountValue, which incorrectly rejects 0 for a
      // valid free-item coupon.
      { new: true, runValidators: false },
    );

    if (!updatedCoupon) throw new AppError("Coupon not found.", 404);

    /*
     * During Next.js development, Mongoose can retain an older compiled Coupon
     * model across hot reloads. An older schema silently strips couponChannel
     * from updates. Write this newly introduced field through the native
     * collection so the selected type is persisted even when that stale model
     * is still present in memory.
     */
    if (input.couponChannel !== undefined || input.publicOfferPlacement !== undefined) {
      const channelWrite = await Coupon.collection.updateOne(
        { _id: new Types.ObjectId(couponId), deletedAt: null },
        {
          $set: {
            ...(input.couponChannel !== undefined
              ? { couponChannel: input.couponChannel }
              : {}),
            ...(input.publicOfferPlacement !== undefined
              ? { publicOfferPlacement: input.publicOfferPlacement }
              : {}),
            updatedBy: new Types.ObjectId(actor.id),
            updatedAt: new Date(),
          },
        },
      );

      if (channelWrite.matchedCount !== 1) {
        throw new AppError("Coupon not found.", 404);
      }
    }

    const persistedCoupon = await Coupon.collection.findOne({
      _id: new Types.ObjectId(couponId),
      deletedAt: null,
    });

    if (!persistedCoupon) throw new AppError("Coupon not found.", 404);

    if (
      input.couponChannel !== undefined &&
      persistedCoupon.couponChannel !== input.couponChannel
    ) {
      throw new AppError("Coupon type could not be updated. Please try again.", 409);
    }

    if (
      input.publicOfferPlacement !== undefined &&
      persistedCoupon.publicOfferPlacement !== input.publicOfferPlacement
    ) {
      throw new AppError("Offer placement could not be updated. Please try again.", 409);
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "coupon.updated",
      entityType: "coupon",
      entityId: couponId,
      description: `Coupon ${String(persistedCoupon.code)} updated.`,
    });

    return successResponse(persistedCoupon, "Coupon updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requirePermission("orders.manage");
    const { couponId } = await context.params;
    await connectToDatabase();

    const coupon = await Coupon.findOne({ _id: couponId, deletedAt: null });
    if (!coupon) throw new AppError("Coupon not found.", 404);

    const deletedCode = coupon.code;
    coupon.deletedAt = new Date();
    coupon.deletedCodeSnapshot = deletedCode;
    coupon.code = buildArchivedCouponCode(coupon.id);
    coupon.isActive = false;
    coupon.updatedBy = new Types.ObjectId(actor.id);
    await coupon.save();

    await writeAuditLog({
      actorUserId: actor.id,
      action: "coupon.deleted",
      entityType: "coupon",
      entityId: coupon.id,
      description: `Coupon ${deletedCode} deleted.`,
    });

    return successResponse(null, "Coupon deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
