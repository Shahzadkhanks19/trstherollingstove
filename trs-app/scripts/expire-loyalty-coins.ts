import { connectToDatabase } from "@/lib/db/mongoose";import { expireLoyaltyCoins } from "@/services/loyalty.service";
async function main(){await connectToDatabase();console.log(await expireLoyaltyCoins(10000));}main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
