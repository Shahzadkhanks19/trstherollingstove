import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const LoyaltyMembershipSchema=new Schema({
 customerId:{type:Schema.Types.ObjectId,ref:"User",required:true,unique:true,index:true},
 tierKey:{type:String,enum:["bronze","silver","gold","platinum"],default:"bronze",index:true},
 tierStartedAt:{type:Date,default:Date.now},nextReviewAt:{type:Date,default:null,index:true},
 lifetimeSpend:{type:Number,min:0,default:0},annualSpend:{type:Number,min:0,default:0},annualOrders:{type:Number,min:0,default:0},
 qualificationYear:{type:Number,required:true,default:()=>new Date().getUTCFullYear()},
 highestTierKey:{type:String,enum:["bronze","silver","gold","platinum"],default:"bronze"},
 upgradeCount:{type:Number,min:0,default:0},downgradeCount:{type:Number,min:0,default:0},
 lastEvaluatedAt:{type:Date,default:null},lastTierChangeAt:{type:Date,default:null},
},{timestamps:true,versionKey:false});
LoyaltyMembershipSchema.index({tierKey:1,annualSpend:-1});
export type LoyaltyMembershipDocument=InferSchemaType<typeof LoyaltyMembershipSchema>;
export const LoyaltyMembership:Model<LoyaltyMembershipDocument>=(models.LoyaltyMembership as Model<LoyaltyMembershipDocument>)||model<LoyaltyMembershipDocument>("LoyaltyMembership",LoyaltyMembershipSchema);
