import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const FinancePeriodCloseSchema=new Schema({
  closeNumber:{type:String,required:true,unique:true,index:true},closeType:{type:String,enum:["month_end","year_end"],required:true,index:true},
  fiscalYear:{type:Number,required:true,index:true},month:{type:Number,min:1,max:12,default:null},periodKey:{type:String,required:true,unique:true,index:true},
  status:{type:String,enum:["open","closing","closed","reopened","failed"],required:true,default:"open",index:true},
  jobRunId:{type:Schema.Types.ObjectId,ref:"FinanceJobRun",default:null},checklist:{type:[{name:{type:String,required:true},completed:{type:Boolean,default:false},completedAt:{type:Date,default:null},notes:{type:String,default:""}}],default:[]},
  lockedAt:{type:Date,default:null},closedAt:{type:Date,default:null},closedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},closedByName:{type:String,default:""},notes:{type:String,default:""},
},{timestamps:true,versionKey:false});
FinancePeriodCloseSchema.index({closeType:1,fiscalYear:1,month:1},{unique:true});
export type FinancePeriodCloseDocument=InferSchemaType<typeof FinancePeriodCloseSchema>;
export const FinancePeriodClose:Model<FinancePeriodCloseDocument>=(models.FinancePeriodClose as Model<FinancePeriodCloseDocument>)||model<FinancePeriodCloseDocument>("FinancePeriodClose",FinancePeriodCloseSchema);
