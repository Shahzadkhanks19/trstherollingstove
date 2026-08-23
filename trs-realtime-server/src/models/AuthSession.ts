import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema } = mongoose;
const schema = new Schema({ userId:{type:Schema.Types.ObjectId,ref:"User"}, expiresAt:Date, revokedAt:Date }, { timestamps:true, versionKey:false });
export type AuthSessionDocument = InferSchemaType<typeof schema>;
export const AuthSession: Model<AuthSessionDocument> = (mongoose.models.AuthSession as Model<AuthSessionDocument>) || mongoose.model<AuthSessionDocument>("AuthSession", schema);
