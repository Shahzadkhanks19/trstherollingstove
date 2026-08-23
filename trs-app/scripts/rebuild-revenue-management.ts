import { buildRevenueSnapshot } from "@/services/revenue-management.service";

async function main() {
  const days = Number(process.argv[2] ?? 30);
  const snapshot = await buildRevenueSnapshot({ days: Number.isFinite(days) ? days : 30, source: "scheduled" });
  console.log({ snapshotId: String(snapshot?._id ?? ""), generatedAt: snapshot?.generatedAt });
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
