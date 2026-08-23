import { handleApiError } from "@/lib/errors/handleApiError";
import { requirePermission } from "@/lib/auth/session";
import { getFinanceGovernanceSummary } from "@/services/finance-governance.service";
import { governanceQuerySchema } from "@/validators/finance-governance";

interface GovernanceModuleSummary {
  module: string;
  auditEvents: number;
  approvals: number;
  pending: number;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");

    const url = new URL(request.url);
    const { days } = governanceQuerySchema.parse({
      days: url.searchParams.get("days") ?? 30,
    });

    const snapshot = await getFinanceGovernanceSummary(days);

    if (!snapshot) {
      throw new Error("Finance governance snapshot is unavailable.");
    }

    const metrics = snapshot.metrics;

    if (!metrics) {
      throw new Error("Finance governance metrics are unavailable.");
    }

    const moduleRows = (snapshot.byModule ?? []).map(
      (item: GovernanceModuleSummary) => [
        item.module,
        item.auditEvents,
        item.approvals,
        item.pending,
      ],
    );

    const rows: unknown[][] = [
      ["FINANCE GOVERNANCE"],
      ["Metric", "Value"],
      ["Audit events", metrics.totalAuditEvents],
      ["Pending approvals", metrics.pendingApprovals],
      ["Approved", metrics.approvedRequests],
      ["Rejected", metrics.rejectedRequests],
      ["Expired", metrics.expiredRequests],
      ["Critical pending", metrics.criticalPending],
      ["Pending value", metrics.pendingValue],
      ["Average decision hours", metrics.averageDecisionHours],
      ["Approval rate", metrics.approvalRate],
      [],
      ["MODULES"],
      ["Module", "Audit events", "Approvals", "Pending"],
      ...moduleRows,
    ];

    const csv = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-governance-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
