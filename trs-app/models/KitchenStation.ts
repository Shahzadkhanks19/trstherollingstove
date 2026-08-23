import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const KitchenStationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    colorLabel: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    sortOrder: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    targetPreparationMinutes: {
      type: Number,
      min: 1,
      max: 240,
      default: 15,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

KitchenStationSchema.index({
  isActive: 1,
  sortOrder: 1,
});

export type KitchenStationDocument =
  InferSchemaType<typeof KitchenStationSchema>;

export const KitchenStation: Model<KitchenStationDocument> =
  (models.KitchenStation as Model<KitchenStationDocument>) ||
  model<KitchenStationDocument>(
    "KitchenStation",
    KitchenStationSchema,
  );
