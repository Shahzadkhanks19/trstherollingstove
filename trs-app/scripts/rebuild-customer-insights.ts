import "../config/env";
import { connectToDatabase } from "../lib/db/mongoose";
import { rebuildCustomerInsights } from "../services/crm.service";

async function main() {
  await connectToDatabase();

  const result = await rebuildCustomerInsights({
    limit: 5000,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });