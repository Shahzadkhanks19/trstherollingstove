import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";

export async function markPosInvoicePrinted(
  invoiceId: string,
  actorId: string,
) {
  let invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      $inc: { printCount: 1 },
      $set: {
        lastPrintedAt: new Date(),
        lastPrintedBy: new Types.ObjectId(actorId),
      },
    },
    { returnDocument: "after" },
  );

  if (!invoice) {
    throw new AppError("Bill not found.", 404);
  }

  if (
    invoice.paymentMethod === "split" &&
    (!invoice.paymentBreakdown || invoice.paymentBreakdown.length === 0)
  ) {
    const order = await Order.findById(invoice.orderId)
      .select({ paymentBreakdown: 1 })
      .lean();

    const paymentBreakdown = (order?.paymentBreakdown ?? [])
      .filter((part) => Number(part.amount) > 0)
      .map((part) => ({
        method: part.method,
        amount: part.amount,
      }));

    if (paymentBreakdown.length > 0) {
      invoice =
        (await Invoice.findByIdAndUpdate(
          invoiceId,
          { $set: { paymentBreakdown } },
          { returnDocument: "after" },
        )) ?? invoice;
    }
  }

  return invoice;
}
