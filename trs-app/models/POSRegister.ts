import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const POSRegisterSchema = new Schema(
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
    locationLabel: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

export type POSRegisterDocument =
  InferSchemaType<typeof POSRegisterSchema>;

export const POSRegister: Model<POSRegisterDocument> =
  (models.POSRegister as Model<POSRegisterDocument>) ||
  model<POSRegisterDocument>("POSRegister", POSRegisterSchema);
