import { AppError } from "@/lib/errors/AppError";
import { OrderCounter } from "@/models/OrderCounter";

const INDIA_TIMEZONE = "Asia/Kolkata";

function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = value("day");
  const month = value("month").toUpperCase();
  const year = value("year");

  if (!day || !month || !year) {
    throw new AppError("Unable to determine the order date.", 500);
  }

  return { day, month, year };
}

export async function nextOrderNumber() {
  const { day, month, year } = getIndiaDateParts();
  const counterKey = `order-${year}-${month}-${day}`;

  const counter = await OrderCounter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  if (!counter) {
    throw new AppError("Unable to generate order number.", 500);
  }

  return `TRS-${day}${month}${year}-${String(counter.sequence).padStart(3, "0")}`;
}
