import { AppError } from "@/lib/errors/AppError";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReportRange = {
  from: Date;
  to: Date;
};

export function resolveReportRange(
  from?: string,
  to?: string,
): ReportRange {
  const now = new Date();

  const resolvedTo = to
    ? new Date(`${to}T23:59:59.999+05:30`)
    : now;

  const resolvedFrom = from
    ? new Date(`${from}T00:00:00.000+05:30`)
    : new Date(resolvedTo.getTime() - 29 * DAY_MS);

  if (
    Number.isNaN(resolvedFrom.getTime()) ||
    Number.isNaN(resolvedTo.getTime())
  ) {
    throw new AppError("Invalid report date range.", 400);
  }

  if (resolvedFrom > resolvedTo) {
    throw new AppError(
      "Report start date must be before the end date.",
      400,
    );
  }

  const maximumRangeMs = 366 * DAY_MS;

  if (
    resolvedTo.getTime() - resolvedFrom.getTime() >
    maximumRangeMs
  ) {
    throw new AppError(
      "Report date range cannot exceed 366 days.",
      400,
    );
  }

  return {
    from: resolvedFrom,
    to: resolvedTo,
  };
}

export function getPreviousRange(
  range: ReportRange,
): ReportRange {
  const duration =
    range.to.getTime() - range.from.getTime();

  return {
    from: new Date(range.from.getTime() - duration - 1),
    to: new Date(range.from.getTime() - 1),
  };
}

export function percentageChange(
  current: number,
  previous: number,
) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number(
    (((current - previous) / previous) * 100).toFixed(2),
  );
}
