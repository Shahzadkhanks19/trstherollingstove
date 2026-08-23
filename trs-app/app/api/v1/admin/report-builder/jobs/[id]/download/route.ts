import { Readable } from "stream";
import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { ReportJob } from "@/models/ReportJob";
import { readReportJobArtifact } from "@/services/report-job-artifact.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("reports.read");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError("Invalid report job.", 422);
    await connectToDatabase();
    const job = await ReportJob.findById(id).select("status outputKey outputFilename outputContentType").lean();
    if (!job || job.status !== "completed" || !job.outputKey) throw new AppError("Generated report output is unavailable.", 404);
    const artifact = await readReportJobArtifact(job.outputKey);
    const body = Readable.toWeb(artifact.stream as Readable) as ReadableStream<Uint8Array>;
    return new Response(body, {
      headers: {
        "Content-Type": job.outputContentType || artifact.contentType,
        "Content-Length": String(artifact.length),
        "Content-Disposition": `attachment; filename="${(job.outputFilename || artifact.filename).replaceAll('"', '')}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) { return handleApiError(error); }
}
