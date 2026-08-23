import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema } = mongoose;
const schema = new Schema({ key:String, name:String, permissionIds:[{type:Schema.Types.ObjectId,ref:"Permission"}], isActive:Boolean }, { timestamps:true, versionKey:false });
export type RoleDocument = InferSchemaType<typeof schema>;
export const Role: Model<RoleDocument> = (mongoose.models.Role as Model<RoleDocument>) || mongoose.model<RoleDocument>("Role", schema);
