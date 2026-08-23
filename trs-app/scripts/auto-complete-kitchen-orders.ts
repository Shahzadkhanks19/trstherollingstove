import "dotenv/config";

import { connectToDatabase } from "@/lib/db/mongoose";
import { autoCompleteOverdueKitchenTickets } from "@/services/kds.service";

await connectToDatabase();
const result = await autoCompleteOverdueKitchenTickets();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
