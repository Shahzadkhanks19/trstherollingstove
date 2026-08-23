import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const LoyaltyTierSchema = new Schema({
  key:{type:String,required:true,unique:true,enum:["bronze","silver","gold","platinum"],index:true},
  name:{type:String,required:true,trim:true,maxlength:60},
  rank:{type:Number,required:true,min:1,max:4,unique:true},
  minimumLifetimeSpend:{type:Number,required:true,min:0},
  minimumAnnualSpend:{type:Number,required:true,min:0,default:0},
  minimumAnnualOrders:{type:Number,required:true,min:0,default:0},
  pointsMultiplier:{type:Number,required:true,min:1,max:10,default:1},
  birthdayBonusCoins:{type:Number,required:true,min:0,default:0},
  benefits:{type:[String],default:[]},
  colorHex:{type:String,required:true,match:/^#[0-9A-F]{6}$/i},
  isActive:{type:Boolean,default:true,index:true},
},{timestamps:true,versionKey:false});
export type LoyaltyTierDocument=InferSchemaType<typeof LoyaltyTierSchema>;
export const LoyaltyTier:Model<LoyaltyTierDocument>=(models.LoyaltyTier as Model<LoyaltyTierDocument>)||model<LoyaltyTierDocument>("LoyaltyTier",LoyaltyTierSchema);
