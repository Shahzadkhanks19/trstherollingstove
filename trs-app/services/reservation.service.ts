import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { Reservation } from "@/models/Reservation";
import { ReservationCounter } from "@/models/ReservationCounter";
import { User } from "@/models/User";
import {
  publishReservationCreated,
  publishReservationStatusChanged,
} from "@/services/realtimeEvents.service";

const ACTIVE_STATUSES = ["pending", "confirmed", "seated"];

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function nextReservationNumber() {
  const key = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const counter = await ReservationCounter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  if (!counter) {
    throw new AppError("Unable to generate reservation number.", 500);
  }

  return `RSV-${key}-${String(counter.sequence).padStart(4, "0")}`;
}

async function ensureNoCustomerConflict(input: {
  customerId: string;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  excludeReservationId?: string;
}) {
  const start = new Date(`${dateOnly(input.reservationDate)}T00:00:00.000Z`);
  const end = new Date(`${dateOnly(input.reservationDate)}T23:59:59.999Z`);

  const filter: Record<string, unknown> = {
    customerId: input.customerId,
    reservationDate: { $gte: start, $lte: end },
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime },
  };

  if (input.excludeReservationId) {
    filter._id = { $ne: input.excludeReservationId };
  }

  const conflict = await Reservation.exists(filter);
  if (conflict) {
    throw new AppError(
      "You already have an overlapping active reservation.",
      409,
    );
  }
}

export async function createReservation(input: {
  customerId: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  tableNumber: string;
  occasion: "none" | "birthday" | "anniversary" | "business" | "family" | "other";
  specialRequest: string;
  source?: "website" | "admin" | "phone" | "walk_in";
  actorId: string;
}) {
  const customer = await User.findById(input.customerId).lean();
  if (!customer) throw new AppError("Customer not found.", 404);

  const reservationDate = new Date(input.reservationDate);
  if (reservationDate.getTime() < Date.now() - 60_000) {
    throw new AppError("Reservation date must be in the future.", 400);
  }

  await ensureNoCustomerConflict({
    customerId: input.customerId,
    reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  const reservationNumber = await nextReservationNumber();
  const actorObjectId = new Types.ObjectId(input.actorId);

  const reservation = await Reservation.create({
    reservationNumber,
    customerId: customer._id,
    customerSnapshot: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
    },
    reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
    guestCount: input.guestCount,
    tableNumber: input.tableNumber,
    occasion: input.occasion,
    specialRequest: input.specialRequest,
    status: "pending",
    statusHistory: [
      {
        status: "pending",
        note: "Reservation requested.",
        changedBy: actorObjectId,
        changedAt: new Date(),
      },
    ],
    source: input.source ?? "website",
    createdBy: actorObjectId,
    updatedBy: actorObjectId,
  });

  publishReservationCreated({
    reservationId: reservation.id,
    reservationNumber:
      reservation.reservationNumber,
    customerId: input.customerId,
    status: reservation.status,
    reservationDate:
      reservation.reservationDate,
    startTime: reservation.startTime,
    guestCount: reservation.guestCount,
    actorId: input.actorId,
  });

  return reservation;
}

export async function cancelCustomerReservation(input: {
  reservationId: string;
  customerId: string;
  reason: string;
}) {
  const reservation = await Reservation.findOne({
    _id: input.reservationId,
    customerId: input.customerId,
  });

  if (!reservation) throw new AppError("Reservation not found.", 404);
  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw new AppError("This reservation can no longer be cancelled.", 409);
  }

  const now = new Date();
  reservation.status = "cancelled";
  reservation.cancellationReason = input.reason;
  reservation.cancelledBy = new Types.ObjectId(input.customerId);
  reservation.cancelledAt = now;
  reservation.updatedBy = new Types.ObjectId(input.customerId);
  reservation.statusHistory.push({
    status: "cancelled",
    note: input.reason,
    changedBy: new Types.ObjectId(input.customerId),
    changedAt: now,
  });

  await reservation.save();

  publishReservationStatusChanged({
    reservationId: reservation.id,
    reservationNumber:
      reservation.reservationNumber,
    customerId:
      reservation.customerId.toString(),
    status: reservation.status,
    note: input.reason,
    actorId: input.customerId,
  });

  return reservation;
}

export async function updateReservationStatus(input: {
  reservationId: string;
  actorId: string;
  status:
    | "confirmed"
    | "seated"
    | "completed"
    | "cancelled"
    | "no_show"
    | "rejected";
  note: string;
  tableNumber?: string;
}) {
  const reservation = await Reservation.findById(input.reservationId);
  if (!reservation) throw new AppError("Reservation not found.", 404);

  const transitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled", "rejected"],
    confirmed: ["seated", "cancelled", "no_show"],
    seated: ["completed"],
    completed: [],
    cancelled: [],
    no_show: [],
    rejected: [],
  };

  if (!transitions[reservation.status]?.includes(input.status)) {
    throw new AppError(
      `Reservation cannot move from ${reservation.status} to ${input.status}.`,
      409,
    );
  }

  const now = new Date();
  const actorObjectId = new Types.ObjectId(input.actorId);

  reservation.status = input.status;
  reservation.updatedBy = actorObjectId;

  if (input.tableNumber !== undefined) {
    reservation.tableNumber = input.tableNumber;
  }

  if (input.status === "confirmed") reservation.confirmedAt = now;
  if (input.status === "seated") reservation.seatedAt = now;
  if (input.status === "completed") reservation.completedAt = now;

  if (["cancelled", "rejected"].includes(input.status)) {
    reservation.cancelledAt = now;
    reservation.cancelledBy = actorObjectId;
    reservation.cancellationReason = input.note;
  }

  reservation.statusHistory.push({
    status: input.status,
    note: input.note,
    changedBy: actorObjectId,
    changedAt: now,
  });

  await reservation.save();

  publishReservationStatusChanged({
    reservationId: reservation.id,
    reservationNumber:
      reservation.reservationNumber,
    customerId:
      reservation.customerId.toString(),
    status: reservation.status,
    note: input.note,
    actorId: input.actorId,
  });

  return reservation;
}
