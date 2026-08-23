import { buildFinanceGovernanceSnapshot } from "@/services/finance-governance.service";
async function main(){const days=Math.max(1,Number(process.argv[2]??30));const snapshot=await buildFinanceGovernanceSnapshot({days,source:"scheduled"});console.log("Finance governance snapshot rebuilt:",snapshot?.periodKey);}main().catch(error=>{console.error(error);process.exitCode=1;});
