import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Invoice } from "@/models/Invoice";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    await requirePermission("pos.use");
    const { id } = await context.params;
    await connectToDatabase();
    const invoice = await Invoice.findById(id).lean();
    if (!invoice) throw new AppError("Bill not found.", 404);
    return successResponse(invoice);
  } catch (error) { return handleApiError(error); }
}
