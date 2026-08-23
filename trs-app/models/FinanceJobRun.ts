import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FinanceJobRunSchema = new Schema({
  runNumber:{type:String,required:true,unique:true,index:true},
  jobType:{type:String,enum:["nightly_reconciliation","overdue_refresh","snapshot_refresh","month_end_close","year_end_close"],required:true,index:true},
  status:{type:String,enum:["queued","running","succeeded","partially_failed","failed","cancelled"],required:true,default:"queued",index:true},
  source:{type:String,enum:["manual","scheduled","system"],required:true,default:"manual"},
  periodStart:{type:Date,default:null},periodEnd:{type:Date,default:null},
  startedAt:{type:Date,default:null},completedAt:{type:Date,default:null},durationMs:{type:Number,min:0,default:0},
  attempts:{type:Number,min:1,default:1},maxAttempts:{type:Number,min:1,default:3},
  steps:{type:[{name:{type:String,required:true},status:{type:String,enum:["pending","running","succeeded","failed","skipped"],required:true},startedAt:{type:Date,default:null},completedAt:{type:Date,default:null},message:{type:String,default:""}}],default:[]},
  errorMessage:{type:String,default:""},metadata:{type:Schema.Types.Mixed,default:{}},
  triggeredBy:{type:Schema.Types.ObjectId,ref:"User",default:null},triggeredByName:{type:String,default:"System"},
},{timestamps:true,versionKey:false});
FinanceJobRunSchema.index({jobType:1,createdAt:-1});FinanceJobRunSchema.index({status:1,createdAt:-1});
export type FinanceJobRunDocument=InferSchemaType<typeof FinanceJobRunSchema>;
export const FinanceJobRun:Model<FinanceJobRunDocument>=(models.FinanceJobRun as Model<FinanceJobRunDocument>)||model<FinanceJobRunDocument>("FinanceJobRun",FinanceJobRunSchema);
