import { Schema,model,models,type InferSchemaType,type Model } from "mongoose";
const ItemSchema=new Schema({menuItemId:{type:Schema.Types.ObjectId,ref:"MenuItem",required:true},score:{type:Number,required:true,min:0},reasonCodes:[{type:String,trim:true,maxlength:60}],explanation:{type:String,trim:true,maxlength:250,default:""}},{_id:false,versionKey:false});
const CustomerRecommendationCacheSchema=new Schema({customerId:{type:Schema.Types.ObjectId,ref:"User",required:true,unique:true,index:true},items:{type:[ItemSchema],default:[]},contextVersion:{type:String,default:"v1"},generatedAt:{type:Date,required:true,default:Date.now,index:true},expiresAt:{type:Date,required:true,index:true}},{timestamps:true,versionKey:false});
CustomerRecommendationCacheSchema.index({expiresAt:1},{expireAfterSeconds:0});
export type CustomerRecommendationCacheDocument=InferSchemaType<typeof CustomerRecommendationCacheSchema>;
export const CustomerRecommendationCache:Model<CustomerRecommendationCacheDocument>=(models.CustomerRecommendationCache as Model<CustomerRecommendationCacheDocument>)||model<CustomerRecommendationCacheDocument>("CustomerRecommendationCache",CustomerRecommendationCacheSchema);
