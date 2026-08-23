import { AppError } from "@/lib/errors/AppError";
import { createInvoicePublicId } from "@/lib/invoices/verification";
import { Invoice } from "@/models/Invoice";

export async function ensureInvoiceVerificationIdentity(
  invoiceId: string,
) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }

  if (!invoice.verificationPublicId) {
    invoice.verificationPublicId =
      createInvoicePublicId();
    invoice.verificationEnabled = true;
    invoice.verificationVersion = 1;
    await invoice.save();
  }

  return invoice;
}