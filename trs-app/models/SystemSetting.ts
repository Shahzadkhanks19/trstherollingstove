import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import { SETTING_SECTIONS } from "@/types/settings";

const SystemSettingSchema = new Schema(
  {
    section: {
      type: String,
      enum: SETTING_SECTIONS,
      required: true,
      unique: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    publicData: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    revision: {
      type: Number,
      min: 1,
      default: 1,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type SystemSettingDocument =
  InferSchemaType<typeof SystemSettingSchema>;

export const SystemSetting:
  Model<SystemSettingDocument> =
    (models.SystemSetting as Model<SystemSettingDocument>) ||
    model<SystemSettingDocument>(
      "SystemSetting",
      SystemSettingSchema,
    );
