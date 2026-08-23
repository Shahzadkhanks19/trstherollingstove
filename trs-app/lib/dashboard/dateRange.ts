import { AppError } from "@/lib/errors/AppError";
import type { DashboardDateRange } from "@/types/dashboardAnalytics";

const INDIA_OFFSET = "+05:30";
const DAY_MS = 24 * 60 * 60 * 1000;

function indiaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfIndiaDay(value: string) {
  return new Date(`${value}T00:00:00.000${INDIA_OFFSET}`);
}

function endOfIndiaDay(value: string) {
  return new Date(`${value}T23:59:59.999${INDIA_OFFSET}`);
}

function normalizeDateInput(value: string | Date | undefined, fallback: string) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (Number.isNaN(value.getTime())) {
    throw new AppError("Invalid dashboard date range.", 400);
  }
  return indiaDateString(value);
}

export function resolveDashboardDateRange(
  from?: string | Date,
  to?: string | Date,
): DashboardDateRange {
  const today = indiaDateString();
  const toDate = normalizeDateInput(to, today);
  const resolvedTo = endOfIndiaDay(toDate);
  const defaultFrom = indiaDateString(new Date(resolvedTo.getTime() - 29 * DAY_MS));
  const fromDate = normalizeDateInput(from, defaultFrom);
  const resolvedFrom = startOfIndiaDay(fromDate);

  if (Number.isNaN(resolvedFrom.getTime()) || Number.isNaN(resolvedTo.getTime())) {
    throw new AppError("Invalid dashboard date range.", 400);
  }

  if (resolvedFrom > resolvedTo) {
    throw new AppError("Dashboard start date must be before end date.", 400);
  }

  if (resolvedTo.getTime() - resolvedFrom.getTime() > 366 * DAY_MS) {
    throw new AppError("Dashboard date range cannot exceed 366 days.", 400);
  }

  return { from: resolvedFrom, to: resolvedTo };
}

export function previousDateRange(range: DashboardDateRange): DashboardDateRange {
  const duration = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  return {
    from: new Date(previousTo.getTime() - duration),
    to: previousTo,
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}
