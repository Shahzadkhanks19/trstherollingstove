import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { AppError } from "@/lib/errors/AppError";
import { renderKotHtml, type ReceiptPaper } from "@/lib/invoices/receipt-html";
import { calculatePosCartTotals } from "@/lib/pos/cart";
import { POSRunningOrder } from "@/models/POSRunningOrder";
import type { RunningOrderKotItem, RunningOrderKotRevision } from "@/lib/pos/running-order-kot";
import { createPrintJob } from "@/services/print-audit.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;

    await connectToDatabase();

    const running = await POSRunningOrder.findById(id).lean();
    if (!running) throw new AppError("Running order not found.", 404);

    const url = new URL(request.url);
    const requestedRevision = Number(url.searchParams.get("revision") ?? running.kitchenRevision ?? 0);
    const revision = (running.kotRevisions ?? []).find(
      (entry) => Number((entry as RunningOrderKotRevision).revision) === requestedRevision,
    ) as RunningOrderKotRevision | undefined;

    const totals = calculatePosCartTotals(running.cart);
    const paper = (url.searchParams.get("paper") === "58mm" ? "58mm" : "80mm") as ReceiptPaper;
    const copies = Math.min(3, Math.max(1, Number(url.searchParams.get("copies") ?? 1)));
    await createPrintJob({ documentType: revision && revision.revision > 1 ? "revision_kot" : "kot", entityType: "running_order", entityId: String(running._id), orderNumber: running.ticketNumber, label: `${revision?.type ?? "initial"} KOT ${running.ticketNumber} · revision ${revision?.revision ?? running.kitchenRevision ?? 1}`, printUrl: request.url, paper, copies, requestedBy: actor.id, metadata: { revision: revision?.revision ?? running.kitchenRevision ?? 1, kitchenToken: running.kitchenToken } });
    const sourceItems: RunningOrderKotItem[] = revision?.items ?? running.cart.lines.map((line) => ({
      action: "initial" as const,
      lineId: line.lineId,
      name: line.name,
      variantName: line.variantName ?? undefined,
      specialInstructions: line.note,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.unitPrice * line.quantity,
      modifiers: line.modifiers.map((modifier) => ({
        optionName: `${modifier.optionName}${modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}`,
      })),
      changeSummary: [] as string[],
    }));

    const html = renderKotHtml(
      {
        invoiceNumber: running.ticketNumber,
        orderNumber: running.ticketNumber,
        kitchenToken: running.kitchenToken,
        issuedAt: revision?.createdAt ?? running.kitchenSentAt ?? running.openedAt,
        customerSnapshot: {
          name: running.cart.customer.name,
          phone: running.cart.customer.phone,
        },
        orderMode: running.cart.orderType,
        tableNumber: running.tableName,
        paymentMethod: "pending",
        kotRevision: revision?.revision ?? running.kitchenRevision ?? 1,
        kotType: revision?.type ?? "initial",
        kotOrderNote: revision?.orderNote ?? running.cart.orderNote,
        kotPreviousOrderNote: revision?.previousOrderNote ?? "",
        items: sourceItems.map((item) => ({
          name: item.name,
          variantName: item.variantName,
          specialInstructions: item.specialInstructions,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          modifiers: item.modifiers,
          kotAction: item.action,
          previousQuantity: item.previousQuantity,
          newQuantity: item.newQuantity,
          changeSummary: item.changeSummary,
        })),
        subtotal: totals.subtotal,
        taxTotal: totals.taxAmount,
        discountTotal: totals.discountAmount,
        packingCharge: totals.packingCharge,
        serviceCharge: totals.serviceCharge,
        additionalCharge: totals.additionalCharge,
        additionalChargeLabel: running.cart.adjustments.additionalChargeLabel,
        grandTotal: totals.grandTotal,
        currency: "INR",
      },
      {
        paper,
        copies,
        showCustomer: url.searchParams.get("customer") === "true",
        showPrices: url.searchParams.get("prices") === "true",
      },
    );

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
