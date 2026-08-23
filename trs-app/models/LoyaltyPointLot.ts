import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
const LoyaltyPointLotSchema=new Schema({customerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},transactionId:{type:Schema.Types.ObjectId,ref:"CoinTransaction",required:true,unique:true},originalAmount:{type:Number,required:true,min:1},remainingAmount:{type:Number,required:true,min:0},expiresAt:{type:Date,required:true,index:true},status:{type:String,enum:["active","consumed","expired"],default:"active",index:true}},{timestamps:true,versionKey:false});
LoyaltyPointLotSchema.index({customerId:1,status:1,expiresAt:1});
export type LoyaltyPointLotDocument=InferSchemaType<typeof LoyaltyPointLotSchema>;
export const LoyaltyPointLot:Model<LoyaltyPointLotDocument>=(models.LoyaltyPointLot as Model<LoyaltyPointLotDocument>)||model<LoyaltyPointLotDocument>("LoyaltyPointLot",LoyaltyPointLotSchema);
