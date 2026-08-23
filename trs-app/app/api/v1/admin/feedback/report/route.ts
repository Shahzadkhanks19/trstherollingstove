import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getReputationSummary } from "@/services/feedback-reputation.service";

export async function GET() {
  await requirePermission("reports.read");
  await connectToDatabase();

  const data = await getReputationSummary(365);
  const rows: Array<Array<string | number>> = [
    ["Metric", "Value"],
    ["Review count", data.reviews.count],
    ["Average rating", Number(data.reviews.average ?? 0).toFixed(2)],
    ["NPS", data.nps.score],
    ["Promoters", data.nps.promoter ?? 0],
    ["Passives", data.nps.passive ?? 0],
    ["Detractors", data.nps.detractor ?? 0],
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=trs-feedback-reputation-report.csv",
    },
  });
}
