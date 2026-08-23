export function combineReservationDateTime(
  reservationDate: Date,
  startTime: string,
) {
  const [hoursText, minutesText] =
    startTime.split(":");

  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  const result = new Date(reservationDate);

  result.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );

  return result;
}

export function retryDelayMs(
  attempt: number,
) {
  const baseMinutes = Math.min(
    60,
    2 ** Math.max(0, attempt - 1),
  );

  return baseMinutes * 60 * 1000;
}
