import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, unique: true, sparse: true, trim: true, index: true },
    avatarUrl: { type: String, trim: true, maxlength: 500, default: "" },
    passwordHash: { type: String, required: true, select: false },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    tokenVersion: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deactivatedAt: { type: Date, default: null },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deactivationReason: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true, versionKey: false },
);

UserSchema.index({ roleId: 1, isActive: 1 });
UserSchema.index({ createdAt: -1 });

export type UserDocument = InferSchemaType<typeof UserSchema>;
export const User: Model<UserDocument> =
  (models.User as Model<UserDocument>) || model<UserDocument>("User", UserSchema);
