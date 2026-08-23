import { z } from "zod";

const columnSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["string", "number", "date", "boolean"]),
  aggregation: z.enum(["none", "sum", "avg", "min", "max", "count"]).default("none"),
});
const filterSchema = z.object({
  field: z.string().trim().min(1).max(100),
  operator: z.enum(["eq", "neq", "contains", "gte", "lte", "in"]),
  value: z.union([z.string().max(500), z.number(), z.boolean(), z.array(z.string().max(120)).max(30)]),
});
const groupSchema = z.object({
  field: z.string().trim().min(1).max(100),
  interval: z.enum(["none", "day", "week", "month", "year"]).default("none"),
});
const chartSchema = z.object({
  categoryField: z.string().trim().max(100).default(""),
  series: z.array(z.object({ field: z.string().trim().min(1).max(100), label: z.string().trim().min(1).max(120) })).max(8).default([]),
  stacked: z.boolean().default(false),
  showLegend: z.boolean().default(true),
});

export const reportDefinitionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  dataset: z.enum(["orders", "internal_consumption"]),
  columns: z.array(columnSchema).min(1).max(30),
  filters: z.array(filterSchema).max(20).default([]),
  groups: z.array(groupSchema).max(5).default([]),
  sort: z.array(z.object({ field: z.string().trim().min(1).max(100), direction: z.enum(["asc", "desc"]) })).max(5).default([]),
  visualization: z.enum(["table", "bar", "line", "pie", "kpi"]).default("table"),
  chart: chartSchema.default({ categoryField: "", series: [], stacked: false, showLegend: true }),
  visibility: z.enum(["private", "team", "organization"]).default("private"),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  isFavorite: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  templateKey: z.string().trim().max(80).default(""),
}).superRefine((input, context) => {
  const groupedFields = new Set(input.groups.map((group) => group.field));
  const hasAggregation = input.columns.some((column) => column.aggregation !== "none");

  if ((input.groups.length > 0 || hasAggregation) && input.columns.some((column) => column.aggregation === "none" && !groupedFields.has(column.key))) {
    context.addIssue({ code: "custom", path: ["columns"], message: "Every non-aggregated column must also be selected as a grouping field." });
  }
  if (input.groups.some((group) => group.interval !== "none" && !input.columns.some((column) => column.key === group.field && column.type === "date"))) {
    context.addIssue({ code: "custom", path: ["groups"], message: "Date intervals can only be used with selected date columns." });
  }
  if (input.visualization !== "table") {
    if (!input.chart.categoryField) context.addIssue({ code: "custom", path: ["chart", "categoryField"], message: "Choose a category field for this visualization." });
    if (!input.chart.series.length && input.visualization !== "kpi") context.addIssue({ code: "custom", path: ["chart", "series"], message: "Choose at least one numeric series." });
  }
});

export const reportPreviewSchema = z.object({
  reportId: z.string().trim().regex(/^[a-f\d]{24}$/i).optional(),
  dataset: z.enum(["orders", "internal_consumption"]),
  columns: z.array(columnSchema).min(1).max(30),
  filters: z.array(filterSchema).max(20).default([]),
  groups: z.array(groupSchema).max(5).default([]),
  sort: z.array(z.object({ field: z.string().trim().min(1).max(100), direction: z.enum(["asc", "desc"]) })).max(5).default([]),
  visualization: z.enum(["table", "bar", "line", "pie", "kpi"]).default("table"),
  chart: chartSchema.default({ categoryField: "", series: [], stacked: false, showLegend: true }),
  limit: z.number().int().min(1).max(500).default(100),
});
