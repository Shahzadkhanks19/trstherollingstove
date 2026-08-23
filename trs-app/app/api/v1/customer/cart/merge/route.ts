import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { getOrCreateCart, recalculateCart, resolveCartLine } from "@/services/cart.service";
import { requirePublicOrderingEnabled } from "@/lib/public-ordering";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");
const mergeSchema = z.object({
  items: z.array(z.object({
    menuItemId: objectId,
    variantId: objectId.nullable().optional(),
    modifiers: z.array(z.object({ groupId: objectId, optionId: objectId })).max(30).default([]),
    quantity: z.number().int().min(1).max(50),
    specialInstructions: z.string().trim().max(500).default(""),
  })).max(100),
});

export async function POST(request: Request) {
  try {
    await requirePublicOrderingEnabled();
    const actor = await requireAuthenticatedUser();
    if (actor.roleKey !== "customer") throw new AppError("Customer access required.", 403);
    const input = await validateRequestBody(request, mergeSchema);
    await connectToDatabase();
    const cart = await getOrCreateCart(actor.id);

    for (const raw of input.items) {
      const line = await resolveCartLine(raw);
      const modifierKey = line.modifiers.map((entry) => `${entry.groupId}:${entry.optionId}`).sort().join("|");
      const existing = cart.items.find((entry) => {
        const existingKey = entry.modifiers.map((modifier) => `${modifier.groupId}:${modifier.optionId}`).sort().join("|");
        return entry.menuItemId.toString() === line.menuItemId.toString()
          && (entry.variantId?.toString() ?? "") === (line.variantId?.toString() ?? "")
          && existingKey === modifierKey
          && entry.specialInstructions === line.specialInstructions;
      });
      if (existing) {
        existing.quantity = Math.min(50, existing.quantity + line.quantity);
        existing.lineTotal = Math.round(existing.lineUnitPrice * existing.quantity * 100) / 100;
      } else {
        cart.items.push(line);
      }
    }
    await cart.save();
    return successResponse(await recalculateCart(actor.id), "Saved cart merged.");
  } catch (error) {
    return handleApiError(error);
  }
}
