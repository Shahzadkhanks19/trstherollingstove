import { connectToDatabase } from "../lib/db/mongoose";
import { InventoryReportCache } from "../models/InventoryReportCache";

async function main() {
  await connectToDatabase();

  const result = await InventoryReportCache.deleteMany({
    expiresAt: { $lte: new Date() },
  });

  console.log(
    JSON.stringify(
      {
        deletedCount: result.deletedCount,
        prunedAt: new Date(),
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
