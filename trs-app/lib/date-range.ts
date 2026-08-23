import { AppError } from "@/lib/errors/AppError";

export function parseDateParameter(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${label} is not a valid date.`, 400);
  }
  return date;
}

export function assertDateRange(from: Date, to: Date) {
  if (from > to) {
    throw new AppError("The start date must be before or equal to the end date.", 400);
  }
}
