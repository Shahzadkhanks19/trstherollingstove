import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { resolveDashboardDateRange } from "@/lib/dashboard/dateRange";
import { getSalesAnalytics } from "@/services/sales-analytics.service";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try { await requirePermission("reports.read"); const url = new URL(request.url); await connectToDatabase(); const data = await getSalesAnalytics(resolveDashboardDateRange(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined)); return successResponse(data); } catch (error) { return handleApiError(error); } }
