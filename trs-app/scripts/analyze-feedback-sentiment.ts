import { connectToDatabase } from "@/lib/db/mongoose";
import { analyzeExistingReviews } from "@/services/feedback-reputation.service";

async function main(): Promise<void> {
  await connectToDatabase();

  const requestedLimit = Number(process.argv[2] ?? 5000);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.floor(requestedLimit)
    : 5000;

  const result = await analyzeExistingReviews(limit);
  console.log(result);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
