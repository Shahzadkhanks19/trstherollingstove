import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Cart } from "@/models/Cart";
import { recalculateCart, resolveCartLine } from "@/services/cart.service";
import { updateCartItemSchema } from "@/validators/order";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

type Context = { params: Promise<{ cartItemId: string }> };

async function actorCustomer() {
  const actor = await requireAuthenticatedUser();
  if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
  return actor;
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await actorCustomer();
    const { cartItemId } = await context.params;
    const input = await validateRequestBody(request, updateCartItemSchema);
    await connectToDatabase();

    const cart = await Cart.findOne({ customerId: actor.id });
    if (!cart) throw new AppError("Cart not found.", 404);
    const current = cart.items.id(cartItemId);
    if (!current) throw new AppError("Cart item not found.", 404);

    const line = await resolveCartLine({
      menuItemId: current.menuItemId.toString(),
      variantId:
        input.variantId !== undefined
          ? input.variantId
          : current.variantId?.toString() ?? null,
      modifiers:
        input.modifiers ??
        current.modifiers.map((entry) => ({
          groupId: entry.groupId.toString(),
          optionId: entry.optionId.toString(),
        })),
      quantity: input.quantity ?? current.quantity,
      specialInstructions:
        input.specialInstructions ?? current.specialInstructions,
    });

    Object.assign(current, line);
    await cart.save();
    return successResponse(await recalculateCart(actor.id), "Cart item updated.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await actorCustomer();
    const { cartItemId } = await context.params;
    await connectToDatabase();

    const cart = await Cart.findOne({ customerId: actor.id });
    if (!cart) throw new AppError("Cart not found.", 404);
    const current = cart.items.id(cartItemId);
    if (!current) throw new AppError("Cart item not found.", 404);
    current.deleteOne();
    await cart.save();

    return successResponse(await recalculateCart(actor.id), "Cart item removed.");
  } catch (error) {
    return handleApiError(error);
  }
}
