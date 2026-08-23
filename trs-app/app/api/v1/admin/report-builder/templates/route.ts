import { requirePermission } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { REPORT_TEMPLATES } from "@/services/report-builder-templates";
export async function GET() { try { await requirePermission("reports.read"); return successResponse(REPORT_TEMPLATES, "Report templates loaded."); } catch (error) { return handleApiError(error); } }
