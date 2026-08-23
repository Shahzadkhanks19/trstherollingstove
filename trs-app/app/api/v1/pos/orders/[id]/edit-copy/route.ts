import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";
import type { PosCartState } from "@/types/pos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();
    const order = await Order.findById(id).lean();
    if (!order || order.orderSource !== "pos") throw new AppError("POS order not found.", 404);

    const customerSnapshot = order.customerSnapshot;

    const cart: PosCartState = {
      version: 4,
      orderType: order.orderMode,
      internalConsumption: {
        saleType: order.saleType,
        referenceId: order.internalConsumption?.referenceId ? String(order.internalConsumption.referenceId) : null,
        personName: order.internalConsumption?.personName ?? "",
        reason: order.internalConsumption?.reason ?? "",
        notes: order.internalConsumption?.notes ?? "",
        managerApprovalEmail: "",
        managerApprovalPassword: "",
        managerApprovalReason: "",
      },
      lines: order.items.map((item) => ({
        lineId: `rebill-${String(item._id)}`,
        itemId: String(item.menuItemId ?? item.posItemId ?? item._id),
        source: item.sourceType,
        name: item.name,
        slug: `copied-order-item-${String(item.menuItemId ?? item.posItemId ?? item._id)}`,
        imageUrl: item.imageUrl ?? "",
        categoryName: "Previous order",
        basePrice: Number(item.baseUnitPrice ?? item.lineUnitPrice),
        unitPrice: Number(item.lineUnitPrice),
        quantity: Number(item.quantity),
        note: item.specialInstructions ?? "",
        variantId: item.variantId ? String(item.variantId) : null,
        variantName: item.variantName || null,
        modifiers: (item.modifiers ?? []).map((modifier) => ({
          groupId: String(modifier.groupId),
          groupName: modifier.groupName,
          optionId: String(modifier.optionId),
          optionName: modifier.optionName,
          quantity: 1,
          unitPrice: Number(modifier.unitPrice ?? 0),
        })),
        modifierSignature: (item.modifiers ?? []).map((modifier) => `${String(modifier.optionId)}:1`).sort().join("|"),
      })),
      orderNote: `Correction/rebill of ${order.orderNumber}${order.customerNote ? ` · ${order.customerNote}` : ""}`,
      customer: {
        id: order.customerId ? String(order.customerId) : "",
        name: customerSnapshot?.name?.trim() || "Walk-in Customer",
        phone: customerSnapshot?.phone ?? "",
        email: customerSnapshot?.email ?? "",
        isWalkIn: !order.customerId,
      },
      adjustments: {
        discountType: order.discountTotal > 0 ? "fixed" : "none",
        discountValue: Number(order.discountTotal ?? 0),
        discountReason: order.discountTotal > 0 ? `Copied from ${order.orderNumber}` : "",
        packingCharge: Number(order.packingCharge ?? 0),
        serviceCharge: Number(order.serviceCharge ?? 0),
        additionalCharge: Number(order.additionalCharge ?? 0),
        additionalChargeLabel: order.additionalChargeLabel || "Additional charge",
        taxRate: order.subtotal > 0 ? Math.round((Number(order.taxTotal ?? 0) / Math.max(1, Number(order.subtotal) - Number(order.discountTotal ?? 0))) * 10000) / 100 : 0,
        taxMode: "exclusive",
      },
    };

    return successResponse({ cart, orderNumber: order.orderNumber }, "Order copied to POS for correction.");
  } catch (error) {
    return handleApiError(error);
  }
}
