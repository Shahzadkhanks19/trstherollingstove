import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import {
  BACKGROUND_JOB_KEYS,
  BACKGROUND_JOB_STATUSES,
} from "@/types/jobs";

const BackgroundJobSchema = new Schema(
  {
    key: {
      type: String,
      enum: BACKGROUND_JOB_KEYS,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: BACKGROUND_JOB_STATUSES,
      default: "queued",
      index: true,
    },
    priority: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      index: true,
    },
    runAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    attempts: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      min: 1,
      max: 20,
      default: 3,
    },
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lockedBy: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    result: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deduplicationKey: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BackgroundJobSchema.index({
  status: 1,
  runAt: 1,
  priority: -1,
  createdAt: 1,
});

BackgroundJobSchema.index(
  {
    deduplicationKey: 1,
    status: 1,
  },
  {
    partialFilterExpression: {
      deduplicationKey: { $ne: "" },
      status: {
        $in: ["queued", "processing"],
      },
    },
  },
);

export type BackgroundJobDocument =
  InferSchemaType<typeof BackgroundJobSchema>;

export const BackgroundJob:
  Model<BackgroundJobDocument> =
    (models.BackgroundJob as
      Model<BackgroundJobDocument>) ||
    model<BackgroundJobDocument>(
      "BackgroundJob",
      BackgroundJobSchema,
    );
