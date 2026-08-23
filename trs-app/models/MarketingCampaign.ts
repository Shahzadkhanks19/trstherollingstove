import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const MarketingCampaignSchema = new Schema({
 name:{type:String,required:true,trim:true,maxlength:120,index:true},
 description:{type:String,trim:true,maxlength:500,default:""},
 channel:{type:String,enum:["email","whatsapp","sms","push"],required:true,index:true},
 status:{type:String,enum:["draft","scheduled","running","paused","completed","cancelled"],default:"draft",index:true},
 subject:{type:String,trim:true,maxlength:180,default:""},
 message:{type:String,required:true,trim:true,maxlength:5000},
 audience:{type:{type:String,enum:["all","segment","risk","manual"],default:"all"},segmentKeys:[{type:String,trim:true,lowercase:true}],riskLevels:[{type:String,enum:["low","medium","high"]}],customerIds:[{type:Schema.Types.ObjectId,ref:"User"}]},
 schedule:{sendAt:{type:Date,default:null,index:true},timezone:{type:String,default:"Asia/Kolkata"}},
 metrics:{audienceSize:{type:Number,default:0},queued:{type:Number,default:0},sent:{type:Number,default:0},delivered:{type:Number,default:0},failed:{type:Number,default:0},opened:{type:Number,default:0},clicked:{type:Number,default:0},converted:{type:Number,default:0}},
 createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true},lastRunAt:{type:Date,default:null},completedAt:{type:Date,default:null}
},{timestamps:true,versionKey:false});
MarketingCampaignSchema.index({status:1,"schedule.sendAt":1});
export type MarketingCampaignDocument=InferSchemaType<typeof MarketingCampaignSchema>;
export const MarketingCampaign:Model<MarketingCampaignDocument>=(models.MarketingCampaign as Model<MarketingCampaignDocument>)||model<MarketingCampaignDocument>("MarketingCampaign",MarketingCampaignSchema);
