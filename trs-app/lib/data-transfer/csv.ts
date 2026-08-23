function serializeValue(
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(value);
  }

  return String(value);
}

function escapeCsvCell(
  value: unknown,
): string {
  const serialized = serializeValue(value);

  if (
    serialized.includes(",") ||
    serialized.includes('"') ||
    serialized.includes("\n") ||
    serialized.includes("\r")
  ) {
    return `"${serialized.replaceAll(
      '"',
      '""',
    )}"`;
  }

  return serialized;
}

export function documentsToCsv(
  documents: Record<string, unknown>[],
): string {
  if (documents.length === 0) {
    return "";
  }

  const headerSet = new Set<string>();

  for (const document of documents) {
    for (const key of Object.keys(document)) {
      headerSet.add(key);
    }
  }

  const headers = Array.from(headerSet);

  const lines = [
    headers.map(escapeCsvCell).join(","),
  ];

  for (const document of documents) {
    lines.push(
      headers
        .map((header) =>
          escapeCsvCell(document[header]),
        )
        .join(","),
    );
  }

  return lines.join("\r\n");
}
