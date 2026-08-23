import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema } = mongoose;
const schema = new Schema({ key:String, name:String, module:String }, { timestamps:true, versionKey:false });
export type PermissionDocument = InferSchemaType<typeof schema>;
export const Permission: Model<PermissionDocument> = (mongoose.models.Permission as Model<PermissionDocument>) || mongoose.model<PermissionDocument>("Permission", schema);
