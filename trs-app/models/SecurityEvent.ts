import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import {
  AUDIT_SEVERITIES,
  SECURITY_EVENT_TYPES,
} from "@/types/audit";

const SecurityEventSchema = new Schema(
  {
    eventType: {
      type: String,
      enum: SECURITY_EVENT_TYPES,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: AUDIT_SEVERITIES,
      required: true,
      default: "warning",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    route: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
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

SecurityEventSchema.index({
  createdAt: -1,
});

SecurityEventSchema.index({
  resolved: 1,
  severity: 1,
  createdAt: -1,
});

export type SecurityEventDocument =
  InferSchemaType<typeof SecurityEventSchema>;

export const SecurityEvent:
  Model<SecurityEventDocument> =
    (models.SecurityEvent as
      Model<SecurityEventDocument>) ||
    model<SecurityEventDocument>(
      "SecurityEvent",
      SecurityEventSchema,
    );
