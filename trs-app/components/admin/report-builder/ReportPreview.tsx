"use client";

import type { ReportChartConfiguration, ReportPreviewColumn, ReportVisualization } from "@/types/report-builder";

type Props = {
  rows: Record<string, unknown>[];
  columns: ReportPreviewColumn[];
  visualization: ReportVisualization;
  chart: ReportChartConfiguration;
};

function formatValue(value: unknown, type?: ReportPreviewColumn["type"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "number" && typeof value === "number") return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
  if (type === "date") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  return String(value);
}

function numeric(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

function TablePreview({ rows, columns }: Pick<Props, "rows" | "columns">) {
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-black/[0.03]"><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b p-3 font-black">{column.label}{column.aggregation !== "none" ? <span className="ml-1 text-[10px] uppercase text-black/40">({column.aggregation})</span> : null}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="hover:bg-black/[0.02]">{columns.map((column) => <td key={column.key} className="whitespace-nowrap border-b p-3">{formatValue(row[column.key], column.type)}</td>)}</tr>)}</tbody></table></div>;
}

function KpiPreview({ rows, columns, chart }: Pick<Props, "rows" | "columns" | "chart">) {
  const row = rows[0] ?? {};
  const metrics = columns.filter((column) => column.type === "number" && (chart.series.length === 0 || chart.series.some((series) => series.field === column.key)));
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.key} className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">{metric.label}</p><p className="mt-3 text-3xl font-black text-[#111820]">{formatValue(row[metric.key], "number")}</p></div>)}</div>;
}

function ChartPreview({ rows, columns, visualization, chart }: Props) {
  const category = columns.find((column) => column.key === chart.categoryField);
  const series = chart.series.map((item) => ({ ...item, column: columns.find((column) => column.key === item.field) })).filter((item) => item.column);
  if (!category || !series.length) return <div className="rounded-xl bg-black/5 p-6 text-sm text-black/60">Choose a category field and at least one numeric series.</div>;
  const max = Math.max(1, ...rows.flatMap((row) => series.map((item) => Math.abs(numeric(row[item.field])))));

  if (visualization === "pie") {
    const first = series[0];
    const total = rows.reduce((sum, row) => sum + Math.max(0, numeric(row[first.field])), 0) || 1;
    return <div className="space-y-3">{rows.slice(0, 20).map((row, index) => { const value = Math.max(0, numeric(row[first.field])); const percentage = value / total * 100; return <div key={index}><div className="mb-1 flex justify-between gap-4 text-xs"><span className="font-bold">{formatValue(row[category.key], category.type)}</span><span>{formatValue(value, "number")} · {percentage.toFixed(1)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#C8102E]" style={{ width: `${Math.max(1, percentage)}%` }} /></div></div>; })}</div>;
  }

  if (visualization === "line") {
    const width = 900; const height = 320; const padding = 32;
    return <div className="overflow-x-auto"><svg role="img" aria-label="Line chart preview" viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full"><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" opacity="0.2" />{series.map((item, seriesIndex) => { const points = rows.map((row, index) => { const x = padding + index * ((width - padding * 2) / Math.max(1, rows.length - 1)); const y = height - padding - (numeric(row[item.field]) / max) * (height - padding * 2); return `${x},${y}`; }).join(" "); return <polyline key={item.field} points={points} fill="none" stroke={seriesIndex === 0 ? "#C8102E" : "#111820"} strokeWidth="3" />; })}</svg></div>;
  }

  return <div className="space-y-4">{rows.slice(0, 30).map((row, rowIndex) => <div key={rowIndex} className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"><div className="truncate text-xs font-bold" title={formatValue(row[category.key], category.type)}>{formatValue(row[category.key], category.type)}</div><div className="space-y-1">{series.map((item) => { const value = numeric(row[item.field]); return <div key={item.field} className="flex items-center gap-2"><div className="h-5 rounded bg-[#C8102E]" style={{ width: `${Math.max(1, Math.abs(value) / max * 100)}%` }} /><span className="shrink-0 text-xs font-bold">{formatValue(value, "number")}</span></div>; })}</div></div>)}</div>;
}

export function ReportPreview(props: Props) {
  if (!props.rows.length) return <div className="rounded-xl bg-black/5 p-8 text-center text-sm text-black/55">No rows matched the current report definition.</div>;
  if (props.visualization === "table") return <TablePreview rows={props.rows} columns={props.columns} />;
  if (props.visualization === "kpi") return <KpiPreview rows={props.rows} columns={props.columns} chart={props.chart} />;
  return <ChartPreview {...props} />;
}
