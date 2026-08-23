import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const POSTableSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true },
  section: { type: String, trim: true, maxlength: 60, default: "Main" },
  capacity: { type: Number, min: 1, max: 50, default: 4 },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ["available", "reserved", "out_of_service"], default: "available", index: true },
  reservationName: { type: String, trim: true, maxlength: 100, default: "" },
  reservationPhone: { type: String, trim: true, maxlength: 20, default: "" },
  reservationTime: { type: Date, default: null },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

POSTableSchema.index({ section: 1, sortOrder: 1, name: 1 });
export type POSTableDocument = InferSchemaType<typeof POSTableSchema>;
export const POSTable: Model<POSTableDocument> =
  (models.POSTable as Model<POSTableDocument>) || model<POSTableDocument>("POSTable", POSTableSchema);
