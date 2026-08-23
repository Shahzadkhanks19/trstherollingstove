import { requireAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { invoiceHtmlResponse } from "@/lib/invoices/response";
import {
  assertCustomerOwnsOrder,
  getOrCreateInvoice,
} from "@/services/invoice.service";

type Context = {
  params: Promise<{ orderId: string }>;
};

export async function GET(
  request: Request,
  context: Context,
) {
  try {
    const actor =
      await requireAuthenticatedUser();

    if (actor.roleKey !== "customer") {
      throw new AppError(
        "Customer access required.",
        403,
      );
    }

    const { orderId } = await context.params;

    await connectToDatabase();
    await assertCustomerOwnsOrder(
      orderId,
      actor.id,
    );

    const invoice = await getOrCreateInvoice(
      orderId,
      actor.id,
    );

    const url = new URL(request.url);
    const format =
      url.searchParams.get("format") ?? "html";
    const download =
      url.searchParams.get("download") === "true";

    if (format === "json") {
      return successResponse(invoice);
    }

    return invoiceHtmlResponse(
      invoice.toObject(),
      download,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
