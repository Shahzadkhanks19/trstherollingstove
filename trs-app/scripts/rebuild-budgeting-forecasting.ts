import { buildBudgetForecastSnapshot, type BudgetScenario } from "@/services/budgeting-forecasting.service";
async function main() {
  const fiscalYear = Number(process.argv[2] ?? new Date().getUTCFullYear());
  const scenario = (process.argv[3] ?? "base") as BudgetScenario;
  const department = process.argv[4] ?? "Company";
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2020 || fiscalYear > 2200) throw new Error("Fiscal year must be between 2020 and 2200.");
  if (!["base","optimistic","conservative"].includes(scenario)) throw new Error("Scenario must be base, optimistic or conservative.");
  const snapshot = await buildBudgetForecastSnapshot({ fiscalYear, scenario, department, source:"scheduled" });
  console.log(`Budget forecast rebuilt: ${snapshot?.periodKey ?? "unknown period"}`);
}
main().catch((error)=>{ console.error(error); process.exitCode=1; });
