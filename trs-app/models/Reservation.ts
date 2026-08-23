import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReservationStatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
        "rejected",
      ],
    },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false, versionKey: false },
);

const ReservationSchema = new Schema(
  {
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 254,
        default: "",
      },
      phone: { type: String, required: true, trim: true, maxlength: 20 },
    },
    reservationDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, trim: true, maxlength: 5 },
    endTime: { type: String, required: true, trim: true, maxlength: 5 },
    guestCount: { type: Number, required: true, min: 1, max: 30 },
    tableNumber: { type: String, trim: true, maxlength: 30, default: "" },
    occasion: {
      type: String,
      enum: [
        "none",
        "birthday",
        "anniversary",
        "business",
        "family",
        "other",
      ],
      default: "none",
    },
    specialRequest: { type: String, trim: true, maxlength: 700, default: "" },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
        "rejected",
      ],
      default: "pending",
      index: true,
    },
    statusHistory: { type: [ReservationStatusHistorySchema], default: [] },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    seatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    reminder24hSent: { type: Boolean, default: false },
    reminder2hSent: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ["website", "admin", "phone", "walk_in"],
      default: "website",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

ReservationSchema.index({ customerId: 1, reservationDate: -1 });
ReservationSchema.index({ reservationDate: 1, startTime: 1, status: 1 });
ReservationSchema.index({ status: 1, reservationDate: 1 });

export type ReservationDocument = InferSchemaType<typeof ReservationSchema>;
export const Reservation: Model<ReservationDocument> =
  (models.Reservation as Model<ReservationDocument>) ||
  model<ReservationDocument>("Reservation", ReservationSchema);
