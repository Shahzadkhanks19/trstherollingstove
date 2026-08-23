import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { getOrCreateCart, recalculateCart, resolveCartLine } from "@/services/cart.service";
import { addCartItemSchema } from "@/validators/order";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    const input = await validateRequestBody(request, addCartItemSchema);
    await connectToDatabase();

    const cart = await getOrCreateCart(actor.id);
    const line = await resolveCartLine(input);
    const modifierKey = line.modifiers
      .map((entry) => `${entry.groupId.toString()}:${entry.optionId.toString()}`)
      .sort()
      .join("|");
    const existing = cart.items.find((entry) => {
      const existingKey = entry.modifiers
        .map((modifier) => `${modifier.groupId.toString()}:${modifier.optionId.toString()}`)
        .sort()
        .join("|");
      return (
        entry.menuItemId.toString() === line.menuItemId.toString() &&
        (entry.variantId?.toString() ?? "") === (line.variantId?.toString() ?? "") &&
        existingKey === modifierKey &&
        entry.specialInstructions === line.specialInstructions
      );
    });

    if (existing) {
      const nextQuantity = existing.quantity + line.quantity;
      if (nextQuantity > 50) throw new AppError("Maximum quantity is 50.", 400);
      existing.quantity = nextQuantity;
      existing.lineTotal = Math.round(existing.lineUnitPrice * nextQuantity * 100) / 100;
    } else {
      cart.items.push(line);
    }
    await cart.save();

    return successResponse(await recalculateCart(actor.id), "Item added to cart.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
