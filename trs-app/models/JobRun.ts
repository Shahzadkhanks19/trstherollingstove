import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import {
  BACKGROUND_JOB_KEYS,
  JOB_RUN_STATUSES,
} from "@/types/jobs";

const JobRunSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "BackgroundJob",
      required: true,
      index: true,
    },
    key: {
      type: String,
      enum: BACKGROUND_JOB_KEYS,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: JOB_RUN_STATUSES,
      required: true,
      default: "running",
      index: true,
    },
    workerId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    attempt: {
      type: Number,
      required: true,
      min: 1,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      min: 0,
      default: 0,
    },
    error: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    result: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

JobRunSchema.index({
  key: 1,
  createdAt: -1,
});

export type JobRunDocument =
  InferSchemaType<typeof JobRunSchema>;

export const JobRun: Model<JobRunDocument> =
  (models.JobRun as Model<JobRunDocument>) ||
  model<JobRunDocument>(
    "JobRun",
    JobRunSchema,
  );
