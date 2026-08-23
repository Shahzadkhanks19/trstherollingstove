import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const CustomerTimelineEventSchema = new Schema({
 customerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true}, eventType:{type:String,required:true,enum:["order","reservation","review","reward","referral","profile","account","note"],index:true}, title:{type:String,required:true,trim:true,maxlength:160}, description:{type:String,trim:true,maxlength:1000,default:""}, occurredAt:{type:Date,required:true,index:true}, sourceId:{type:Schema.Types.ObjectId,default:null}, sourceModel:{type:String,trim:true,maxlength:60,default:""}, amount:{type:Number,default:0}, metadata:{type:Schema.Types.Mixed,default:{}},
},{timestamps:true,versionKey:false});
CustomerTimelineEventSchema.index({customerId:1,occurredAt:-1});
CustomerTimelineEventSchema.index({customerId:1,eventType:1,occurredAt:-1});
export type CustomerTimelineEventDocument=InferSchemaType<typeof CustomerTimelineEventSchema>;
export const CustomerTimelineEvent:Model<CustomerTimelineEventDocument>=(models.CustomerTimelineEvent as Model<CustomerTimelineEventDocument>)||model<CustomerTimelineEventDocument>("CustomerTimelineEvent",CustomerTimelineEventSchema);
