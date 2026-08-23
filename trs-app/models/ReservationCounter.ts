import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReservationCounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

export type ReservationCounterDocument = InferSchemaType<
  typeof ReservationCounterSchema
>;

export const ReservationCounter: Model<ReservationCounterDocument> =
  (models.ReservationCounter as Model<ReservationCounterDocument>) ||
  model<ReservationCounterDocument>(
    "ReservationCounter",
    ReservationCounterSchema,
  );
