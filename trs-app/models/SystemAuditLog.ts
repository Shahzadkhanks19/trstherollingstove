import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import {
  AUDIT_OUTCOMES,
  AUDIT_SEVERITIES,
} from "@/types/audit";

const SystemAuditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    actorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    actorRole: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    entityType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
      index: true,
    },
    entityId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    severity: {
      type: String,
      enum: AUDIT_SEVERITIES,
      default: "info",
      index: true,
    },
    outcome: {
      type: String,
      enum: AUDIT_OUTCOMES,
      default: "success",
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

SystemAuditLogSchema.index({
  createdAt: -1,
});

SystemAuditLogSchema.index({
  module: 1,
  action: 1,
  createdAt: -1,
});

export type SystemAuditLogDocument =
  InferSchemaType<typeof SystemAuditLogSchema>;

export const SystemAuditLog:
  Model<SystemAuditLogDocument> =
    (models.SystemAuditLog as
      Model<SystemAuditLogDocument>) ||
    model<SystemAuditLogDocument>(
      "SystemAuditLog",
      SystemAuditLogSchema,
    );
