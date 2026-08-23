import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const AuthSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 500,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      maxlength: 100,
      trim: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokeReason: {
      type: String,
      default: "",
      maxlength: 200,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false },
);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuthSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });

export type AuthSessionDocument = InferSchemaType<typeof AuthSessionSchema>;

export const AuthSession: Model<AuthSessionDocument> =
  (models.AuthSession as Model<AuthSessionDocument>) ||
  model<AuthSessionDocument>("AuthSession", AuthSessionSchema);
