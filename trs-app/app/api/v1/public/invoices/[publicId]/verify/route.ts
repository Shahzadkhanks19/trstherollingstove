import { connectToDatabase } from "@/lib/db/mongoose";
import { successResponse } from "@/lib/http/apiResponse";
import { verifyInvoiceSignature } from "@/lib/invoices/verification";
import { Invoice } from "@/models/Invoice";

type Context = {
  params: Promise<{ publicId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: Context,
) {
  const { publicId } = await context.params;
  const signature =
    new URL(request.url).searchParams.get("sig") ?? "";

  await connectToDatabase();

  const invoice = await Invoice.findOne({
    verificationPublicId: publicId,
    verificationEnabled: { $ne: false },
  }).lean();

  if (
    !invoice ||
    !verifyInvoiceSignature(
      publicId,
      invoice.invoiceNumber,
      signature,
    )
  ) {
    return Response.json(
      {
        success: false,
        message: "Invoice verification failed.",
      },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  await Invoice.updateOne(
    { _id: invoice._id },
    {
      $set: { lastVerifiedAt: new Date() },
      $inc: { verificationCount: 1 },
    },
  );

  return successResponse(
    {
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      issuedAt: invoice.issuedAt,
      businessName:
        invoice.businessSnapshot?.tradeName ||
        invoice.businessSnapshot?.legalName ||
        "The Rolling Stove",
      customerName:
        invoice.customerSnapshot?.name || "Walk-in Customer",
      orderMode: invoice.orderMode,
      tableNumber: invoice.tableNumber,
      paymentMethod: invoice.paymentMethod,
      paymentStatus: invoice.paymentStatus,
      items: invoice.items.map((item) => ({
        name: item.name,
        variantName: item.variantName,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      discountTotal: invoice.discountTotal,
      grandTotal: invoice.grandTotal,
      currency: invoice.currency,
    },
    "Invoice verified successfully.",
  );
}
