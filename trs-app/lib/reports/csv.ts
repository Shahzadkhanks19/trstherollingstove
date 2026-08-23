function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function rowsToCsv(
  rows: Array<Record<string, unknown>>,
) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvValue(row[header]))
        .join(","),
    ),
  ];

  return lines.join("\r\n");
}
