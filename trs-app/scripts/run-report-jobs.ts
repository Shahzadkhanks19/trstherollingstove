import { connectToDatabase } from "@/lib/db/mongoose";
import { enqueueDueScheduledReports, runReportJobWorker } from "@/services/report-job-runner.service";

async function main() {
  const limit = Math.min(Math.max(Number(process.argv[2] || 25), 1), 50);
  await connectToDatabase();
  const scheduled = await enqueueDueScheduledReports(200);
  const worker = await runReportJobWorker(limit);
  console.log(JSON.stringify({ scheduled, worker }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
