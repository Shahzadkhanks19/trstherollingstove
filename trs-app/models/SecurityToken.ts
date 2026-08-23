import {Schema,model,models,type InferSchemaType,type Model} from "mongoose";
const schema=new Schema({userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},type:{type:String,enum:["password_reset","email_verification"],required:true,index:true},tokenHash:{type:String,required:true,unique:true,select:false},expiresAt:{type:Date,required:true},consumedAt:{type:Date,default:null}},{timestamps:true,versionKey:false});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export type SecurityTokenDocument=InferSchemaType<typeof schema>;
export const SecurityToken:Model<SecurityTokenDocument>=(models.SecurityToken as Model<SecurityTokenDocument>)||model<SecurityTokenDocument>("SecurityToken",schema);
