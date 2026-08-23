import { buildFinancialReportSnapshot } from "@/services/financial-reports.service";

async function main() {
  const days = Number(process.argv[2] ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Days must be an integer between 1 and 3650.");
  const snapshot = await buildFinancialReportSnapshot({ days, source: "scheduled" });
  console.log(`Financial reports rebuilt for ${days} days: ${snapshot?.periodKey ?? "unknown period"}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
