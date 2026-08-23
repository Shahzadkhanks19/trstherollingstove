import { buildExecutiveFinanceSnapshot } from "@/services/executive-finance.service";
async function main() {
  const days = Number(process.argv[2] ?? 30);
  const fiscalYear = Number(process.argv[3] ?? new Date().getUTCFullYear());
  const scenario = (process.argv[4] ?? "base") as "base" | "optimistic" | "conservative";
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Days must be an integer between 1 and 3650.");
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2200) throw new Error("Fiscal year is invalid.");
  if (!["base", "optimistic", "conservative"].includes(scenario)) throw new Error("Scenario must be base, optimistic or conservative.");
  const snapshot = await buildExecutiveFinanceSnapshot({ days, fiscalYear, scenario, source: "scheduled" });
  console.log(`Executive finance dashboard rebuilt: ${snapshot?.periodKey ?? "unknown period"}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
