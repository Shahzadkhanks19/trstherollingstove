import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { createSimpleTextPdf } from "@/lib/pdf/simpleTextPdf";
import { PurchaseOrder } from "@/models/PurchaseOrder";

type Context = { params: Promise<{ id: string }> };
function formatDate(value: Date | null | undefined) { return value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "Not specified"; }

export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission("purchases.read");
    const { id } = await context.params;
    await connectToDatabase();
    const order = await PurchaseOrder.findById(id).populate("supplierId", "name code contactPerson phone addressLine1 addressLine2 city state postalCode").lean();
    if (!order) throw new AppError("Purchase order not found.", 404);
    const supplier = order.supplierId as unknown as { name?: string; code?: string; contactPerson?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string };
    const lines = [
      `Purchase request: ${order.purchaseOrderNumber}`,
      `Vendor: ${supplier?.name ?? "Unknown"} (${supplier?.code ?? "-"})`,
      `WhatsApp: ${supplier?.phone || "Not available"}`,
      `Contact person: ${supplier?.contactPerson || "Not specified"}`,
      `Address: ${[supplier?.addressLine1, supplier?.addressLine2, supplier?.city, supplier?.state, supplier?.postalCode].filter(Boolean).join(", ") || "Not specified"}`,
      `Order date: ${formatDate(order.orderDate)}`,
      `Expected date: ${formatDate(order.expectedDeliveryDate)}`,
      `Fulfilment: ${order.fulfilmentType === "self_pickup" ? "Self Pickup" : "Vendor Delivery"}`,
      ...(order.fulfilmentType === "self_pickup" ? [`Pickup person: ${order.pickupPersonName || "Not specified"}`, `Pickup WhatsApp: ${order.pickupPersonWhatsapp || "Not specified"}`] : []),
      "", "ITEMS",
      ...order.items.map((item: { itemName: string; sku: string; orderedQuantity: number; unit: string }, index: number) => `${index + 1}. ${item.itemName} | SKU: ${item.sku} | Quantity: ${item.orderedQuantity} ${item.unit}`),
      "", `Notes: ${order.notes || "None"}`, "", "Generated from TRS Purchasing Management",
    ];
    const pdf = createSimpleTextPdf(`TRS - ${order.purchaseOrderNumber}`, lines);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${order.purchaseOrderNumber}.pdf"`, "Cache-Control": "no-store" } });
  } catch (error) { return handleApiError(error); }
}
