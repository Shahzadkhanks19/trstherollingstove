import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportExecution } from "@/models/ReportExecution";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("reports.read");
    const { id } = await context.params; if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report.", 422); await connectToDatabase();
    const allowed = await ReportDefinition.exists({ _id: id, $or: [{ createdBy: actor.id }, { visibility: { $in: ["team", "organization"] } }] });
    if (!allowed) throw new AppError("Report not found.", 404);
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 25), 1), 100);
    const executions = await ReportExecution.find({ reportId: id }).sort({ createdAt: -1 }).limit(limit).lean();
    return successResponse({ executions }, "Execution history loaded.");
  } catch (error) { return handleApiError(error); }
}
