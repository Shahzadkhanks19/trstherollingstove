import { connectToDatabase } from "@/lib/db/mongoose";
import { buildEnterpriseHealthSnapshot } from "@/services/enterprise-operations.service";
async function main(){await connectToDatabase();const snapshot=await buildEnterpriseHealthSnapshot("scheduled");console.log(JSON.stringify({status:snapshot.status,score:snapshot.score,generatedAt:snapshot.generatedAt},null,2));process.exit(snapshot.status==="critical"?1:0);}main().catch((error)=>{console.error(error);process.exit(1);});
