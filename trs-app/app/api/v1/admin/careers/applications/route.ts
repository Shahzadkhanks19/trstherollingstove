import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import {
  JobApplication,
} from "@/models/JobApplication";
import "@/models/CareerOpening";

const JOB_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
] as const;

type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

function isJobApplicationStatus(value: string | null): value is JobApplicationStatus {
  return (JOB_APPLICATION_STATUSES as readonly string[]).includes(value ?? "");
}

export async function GET(request: Request) {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const filter: { status?: JobApplicationStatus } = isJobApplicationStatus(status)
      ? { status }
      : {};

    const rows = await JobApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return successResponse(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
