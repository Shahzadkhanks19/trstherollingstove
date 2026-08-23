import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { AppError } from "@/lib/errors/AppError";
import { successResponse } from "@/lib/http/apiResponse";
import { PrintJob } from "@/models/PrintJob";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const { id } = await context.params;
    const body = await request.json() as { status?: string; failureReason?: string };
    if (!body.status || !["requested", "opened", "printed", "failed"].includes(body.status)) throw new AppError("Invalid print status.", 400);
    const now = new Date();
    const update: Record<string, unknown> = { status: body.status, failureReason: body.failureReason ?? "" };
    if (body.status === "opened") update.openedAt = now;
    if (body.status === "printed") update.printedAt = now;
    if (body.status === "failed") update.failedAt = now;
    const job = await PrintJob.findByIdAndUpdate(id, update, { new: true });
    if (!job) throw new AppError("Print job not found.", 404);
    return successResponse(job);
  } catch (error) { return handleApiError(error); }
}
