import { connectToDatabase } from "../lib/db/mongoose";
import {
  runDueInventoryJobs,
  runDueScheduledReports,
} from "../services/inventory-automation.service";

async function main() {
  await connectToDatabase();

  const [reports, retries] = await Promise.all([
    runDueScheduledReports(),
    runDueInventoryJobs(),
  ]);

  console.log(
    JSON.stringify(
      {
        reports,
        retries,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
