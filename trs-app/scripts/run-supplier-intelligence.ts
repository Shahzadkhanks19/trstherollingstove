import { connectToDatabase } from "../lib/db/mongoose";
import { generateSupplierIntelligence } from "../services/supplier-intelligence.service";
async function main(){await connectToDatabase();const result=await generateSupplierIntelligence({lookbackDays:Number(process.env.SUPPLIER_INTELLIGENCE_LOOKBACK_DAYS??365),source:"scheduled"});console.log(JSON.stringify(result,null,2));}
main().catch(error=>{console.error(error);process.exitCode=1;});
