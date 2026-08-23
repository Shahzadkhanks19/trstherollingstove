import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const LoyaltyMilestoneProgressSchema=new Schema({customerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},milestoneId:{type:Schema.Types.ObjectId,ref:"LoyaltyMilestone",required:true,index:true},currentValue:{type:Number,min:0,default:0},completedAt:{type:Date,default:null},rewardTransactionId:{type:Schema.Types.ObjectId,ref:"CoinTransaction",default:null}},{timestamps:true,versionKey:false});
LoyaltyMilestoneProgressSchema.index({customerId:1,milestoneId:1},{unique:true});
export type LoyaltyMilestoneProgressDocument=InferSchemaType<typeof LoyaltyMilestoneProgressSchema>;
export const LoyaltyMilestoneProgress:Model<LoyaltyMilestoneProgressDocument>=(models.LoyaltyMilestoneProgress as Model<LoyaltyMilestoneProgressDocument>)||model<LoyaltyMilestoneProgressDocument>("LoyaltyMilestoneProgress",LoyaltyMilestoneProgressSchema);
