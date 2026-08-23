import { buildExpenseSnapshot } from "@/services/expense-management.service";
async function main(){const days=Math.min(366,Math.max(1,Number(process.argv[2]??30)));const snapshot=await buildExpenseSnapshot({days,source:"scheduled"});console.log({snapshotId:String(snapshot?._id??""),generatedAt:snapshot?.generatedAt});}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
