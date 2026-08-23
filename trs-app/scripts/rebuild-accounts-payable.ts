import { buildAccountsPayableSnapshot } from "@/services/accounts-payable.service";
async function main(){const days=Math.min(366,Math.max(1,Number(process.argv[2]??30)));const snapshot=await buildAccountsPayableSnapshot({days,source:"scheduled"});console.log(`Accounts payable snapshot rebuilt for ${days} days: ${snapshot?.periodKey??"unknown"}`);}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
