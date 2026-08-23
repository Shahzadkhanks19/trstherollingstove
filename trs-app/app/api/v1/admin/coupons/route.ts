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
import { couponCreateSchema } from "@/validators/rewards";

export async function GET(request: Request) {
  try {
    await requirePermission("orders.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25), 1), 100);
    const search = url.searchParams.get("search")?.trim();
    const active = url.searchParams.get("active");
    const channel = url.searchParams.get("channel");

    const filter: Record<string, unknown> = { deletedAt: null };
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (channel === "spin_wheel_only" || channel === "public_offer") {
      filter.couponChannel = channel;
    }

    /*
     * Read through the native collection so couponChannel remains visible even
     * if Next.js development hot reload is temporarily holding an older
     * compiled Mongoose model that predates this field.
     */
    const [coupons, total] = await Promise.all([
      Coupon.collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      Coupon.collection.countDocuments(filter),
    ]);

    return successResponse(
      { coupons, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      "Coupons loaded.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("orders.manage");
    const input = await validateRequestBody(request, couponCreateSchema);
    await connectToDatabase();

    const deletedCouponWithSameCode = await Coupon.findOne({
      code: input.code,
      deletedAt: { $ne: null },
    })
      .select({ _id: 1, code: 1, deletedCodeSnapshot: 1 })
      .lean();

    if (deletedCouponWithSameCode) {
      await Coupon.updateOne(
        {
          _id: deletedCouponWithSameCode._id,
          code: input.code,
          deletedAt: { $ne: null },
        },
        {
          $set: {
            code: buildArchivedCouponCode(String(deletedCouponWithSameCode._id)),
            deletedCodeSnapshot:
              deletedCouponWithSameCode.deletedCodeSnapshot ?? deletedCouponWithSameCode.code,
          },
        },
      );
    }

    if (input.discountType === "free_item") {
      const freeItemExists = await MenuItem.exists({
        _id: input.freeMenuItemId,
        isActive: true,
        isAvailable: true,
        deletedAt: null,
      });
      if (!freeItemExists) {
        throw new AppError(
          "Select a valid active and available free item.",
          400,
        );
      }
    }

    const coupon = await Coupon.create({
      ...input,
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      description: `Coupon ${coupon.code} created.`,
    });

    return successResponse(coupon, "Coupon created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
