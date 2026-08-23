import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Cart } from "@/models/Cart";
import { validateCoupon } from "@/services/rewards.service";
import { applyCouponSchema } from "@/validators/rewards";

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    const input = await validateRequestBody(request, applyCouponSchema);
    await connectToDatabase();

    const cart = await Cart.findOne({ customerId: actor.id }).lean();
    if (!cart || cart.items.length === 0) throw new AppError("Your cart is empty.", 400);
    if (cart.items.some((item) => item.isCombo === true || item.isDiscountedItem === true)) {
      throw new AppError(
        "Coupons are not available when the cart contains a combo or discounted menu item.",
        400,
      );
    }

    const result = await validateCoupon({
      code: input.code,
      customerId: actor.id,
      subtotal: cart.subtotal,
      orderMode: cart.orderMode,
      items: cart.items.map((item) => ({
        menuItemId: String(item.menuItemId),
        lineTotal: item.lineTotal,
        lineUnitPrice: item.lineUnitPrice,
        quantity: item.quantity,
      })),
    });

    return successResponse(
      {
        couponId: result.coupon._id,
        code: result.coupon.code,
        discountAmount: result.discountAmount,
        freeItem: result.freeItem,
      },
      "Coupon is valid.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
