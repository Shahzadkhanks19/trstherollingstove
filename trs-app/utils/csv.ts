const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export function buildCsv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows].map(row => row.map(esc).join(",")).join("\r\n")}`;
}
