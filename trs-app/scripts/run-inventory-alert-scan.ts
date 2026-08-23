import { connectToDatabase } from "../lib/db/mongoose";
import { createAndRunInventoryJob } from "../services/inventory-automation.service";

async function main() {
  await connectToDatabase();

  const job = await createAndRunInventoryJob({
    jobType: "alert_scan",
    source: "system",
    scheduleKey: "cli-inventory-alert-scan",
  });

  console.log(
    JSON.stringify(
      {
        id: job?._id,
        status: job?.status,
        result: job?.result,
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
