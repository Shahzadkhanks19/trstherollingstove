import { connectToDatabase } from "@/lib/db/mongoose";import { rebuildAllLoyaltyMemberships } from "@/services/loyalty.service";
async function main(){await connectToDatabase();console.log(await rebuildAllLoyaltyMemberships(100000));}main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
