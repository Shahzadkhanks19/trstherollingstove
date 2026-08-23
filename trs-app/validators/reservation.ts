import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format.");

const reservationBaseSchema = z.object({
  reservationDate: z.iso.datetime(),
  startTime: time,
  endTime: time,
  guestCount: z.number().int().min(1).max(30),
  tableNumber: z.string().trim().max(30).default(""),
  occasion: z
    .enum(["none", "birthday", "anniversary", "business", "family", "other"])
    .default("none"),
  specialRequest: z.string().trim().max(700).default(""),
});

export const createReservationSchema = reservationBaseSchema.refine(
  (value) => value.startTime < value.endTime,
  {
    message: "End time must be later than start time.",
    path: ["endTime"],
  },
);

export const adminCreateReservationSchema = reservationBaseSchema
  .extend({
    customerId: objectId,
    source: z.enum(["admin", "phone", "walk_in"]).default("admin"),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "End time must be later than start time.",
    path: ["endTime"],
  });

const updateReservationBaseSchema = z.object({
  reservationDate: z.iso.datetime().optional(),
  startTime: time.optional(),
  endTime: time.optional(),
  guestCount: z.number().int().min(1).max(30).optional(),
  tableNumber: z.string().trim().max(30).optional(),
  occasion: z
    .enum(["none", "birthday", "anniversary", "business", "family", "other"])
    .optional(),
  specialRequest: z.string().trim().max(700).optional(),
});

export const updateReservationSchema = updateReservationBaseSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field." },
);

export const updateReservationStatusSchema = z.object({
  status: z.enum([
    "confirmed",
    "seated",
    "completed",
    "cancelled",
    "no_show",
    "rejected",
  ]),
  note: z.string().trim().max(500).default(""),
  tableNumber: z.string().trim().max(30).optional(),
});

export const cancelReservationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const reservationAvailabilityQuerySchema = z.object({
  date: z.iso.date(),
  guestCount: z.coerce.number().int().min(1).max(30),
});
