import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema } = mongoose;
const schema = new Schema({ name:String, email:String, roleId:{type:Schema.Types.ObjectId,ref:"Role"}, isActive:Boolean, tokenVersion:Number }, { timestamps:true, versionKey:false });
export type UserDocument = InferSchemaType<typeof schema>;
export const User: Model<UserDocument> = (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", schema);
