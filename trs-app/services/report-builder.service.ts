import type { PipelineStage } from "mongoose";
import { Order } from "@/models/Order";
import { ReportDefinition } from "@/models/ReportDefinition";
import { ReportExecution } from "@/models/ReportExecution";
import { getDataset } from "@/services/report-builder-registry";
import type {
  ReportAggregation,
  ReportColumnType,
  ReportDefinitionInput,
  ReportFilterDefinition,
  ReportGroupDefinition,
  ReportPreviewColumn,
  ReportPreviewResult,
} from "@/types/report-builder";
import { AppError } from "@/lib/errors/AppError";

const INDIA_TIMEZONE = "Asia/Kolkata";

type RegistryColumn = { key: string; label: string; type: ReportColumnType; path: string };

function normalizeValue(value: ReportFilterDefinition["value"], type: ReportColumnType): unknown {
  const convert = (entry: string | number | boolean): string | number | boolean | Date => {
    if (type === "number") {
      const parsed = Number(entry);
      if (!Number.isFinite(parsed)) throw new AppError("A numeric report filter contains an invalid value.", 422);
      return parsed;
    }
    if (type === "boolean") return entry === true || entry === "true";
    if (type === "date") {
      const parsed = new Date(String(entry));
      if (Number.isNaN(parsed.getTime())) throw new AppError("A date report filter contains an invalid value.", 422);
      return parsed;
    }
    return String(entry);
  };
  return Array.isArray(value) ? value.map((entry) => convert(entry)) : convert(value);
}

function toFieldMatch(column: RegistryColumn, filter: ReportFilterDefinition): Record<string, unknown> {
  const field = column.path.slice(1);
  const value = normalizeValue(filter.value, column.type);
  switch (filter.operator) {
    case "eq": return { [field]: value };
    case "neq": return { [field]: { $ne: value } };
    case "contains": {
      if (column.type !== "string") throw new AppError("Contains can only be used with text fields.", 422);
      return { [field]: { $regex: String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } };
    }
    case "gte": return { [field]: { $gte: value } };
    case "lte": return { [field]: { $lte: value } };
    case "in": return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    default: throw new AppError("Unsupported filter operator.", 422);
  }
}

function dateGroupExpression(path: string, interval: ReportGroupDefinition["interval"]): unknown {
  if (interval === "none") return path;
  const format = interval === "day" ? "%Y-%m-%d" : interval === "week" ? "%G-W%V" : interval === "month" ? "%Y-%m" : "%Y";
  return { $dateToString: { date: path, format, timezone: INDIA_TIMEZONE } };
}

function aggregationExpression(aggregation: ReportAggregation, path: string): unknown {
  switch (aggregation) {
    case "sum": return { $sum: { $ifNull: [path, 0] } };
    case "avg": return { $avg: { $ifNull: [path, 0] } };
    case "min": return { $min: path };
    case "max": return { $max: path };
    case "count": return { $sum: 1 };
    default: throw new AppError("Unsupported report aggregation.", 422);
  }
}

function assertDefinition(input: Pick<ReportDefinitionInput, "columns" | "filters" | "groups" | "sort" | "chart" | "visualization">, columns: RegistryColumn[]): Map<string, RegistryColumn> {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const selected = new Set(input.columns.map((column) => column.key));
  for (const column of input.columns) {
    const registryColumn = byKey.get(column.key);
    if (!registryColumn) throw new AppError(`Unsupported column: ${column.key}`, 422);
    if (registryColumn.type !== column.type) throw new AppError(`Column type mismatch: ${column.key}`, 422);
    if (column.aggregation !== "none" && column.aggregation !== "count" && registryColumn.type !== "number") {
      throw new AppError(`${column.label} does not support ${column.aggregation}.`, 422);
    }
  }
  for (const filter of input.filters) if (!byKey.has(filter.field)) throw new AppError(`Unsupported filter field: ${filter.field}`, 422);
  for (const group of input.groups) {
    const column = byKey.get(group.field);
    if (!column || !selected.has(group.field)) throw new AppError(`Grouping field must be selected: ${group.field}`, 422);
    if (group.interval !== "none" && column.type !== "date") throw new AppError("Date grouping intervals require a date field.", 422);
  }
  for (const sort of input.sort) if (!selected.has(sort.field)) throw new AppError(`Sort field must be selected: ${sort.field}`, 422);
  if (input.visualization !== "table") {
    if (!selected.has(input.chart.categoryField)) throw new AppError("Chart category must be a selected report column.", 422);
    for (const series of input.chart.series) {
      const column = input.columns.find((item) => item.key === series.field);
      if (!column || column.type !== "number") throw new AppError("Chart series must use selected numeric columns.", 422);
    }
  }
  return byKey;
}

function buildPipeline(
  input: Pick<ReportDefinitionInput, "columns" | "filters" | "groups" | "sort"> & { limit: number },
  dataset: ReturnType<typeof getDataset>,
  byKey: Map<string, RegistryColumn>,
): PipelineStage[] {
  const matchParts: Record<string, unknown>[] = [dataset.baseMatch];
  for (const filter of input.filters) matchParts.push(toFieldMatch(byKey.get(filter.field)!, filter));

  const pipeline: PipelineStage[] = [
    { $match: matchParts.length === 1 ? matchParts[0] : { $and: matchParts } },
  ];
  const hasAggregation = input.columns.some((column) => column.aggregation !== "none");
  const isGrouped = hasAggregation || input.groups.length > 0;

  if (isGrouped) {
    const groupsByField = new Map(input.groups.map((group) => [group.field, group]));
    const id: Record<string, unknown> = {};
    for (const group of input.groups) {
      const column = byKey.get(group.field)!;
      id[group.field] = dateGroupExpression(column.path, group.interval);
    }
    const groupStage: Record<string, unknown> = { _id: Object.keys(id).length ? id : null };
    for (const selected of input.columns) {
      if (selected.aggregation !== "none") groupStage[selected.key] = aggregationExpression(selected.aggregation, byKey.get(selected.key)!.path);
      else if (!groupsByField.has(selected.key)) throw new AppError(`Non-aggregated column must be grouped: ${selected.label}`, 422);
    }
    pipeline.push({ $group: groupStage } as PipelineStage.Group);
    const projection: Record<string, unknown> = { _id: 0 };
    for (const selected of input.columns) projection[selected.key] = selected.aggregation === "none" ? `$_id.${selected.key}` : `$${selected.key}`;
    pipeline.push({ $project: projection });
  } else {
    const projection: Record<string, unknown> = { _id: 0 };
    for (const selected of input.columns) projection[selected.key] = byKey.get(selected.key)!.path;
    pipeline.push({ $project: projection });
  }

  const sort: Record<string, 1 | -1> = Object.fromEntries(input.sort.map((item) => [item.field, item.direction === "asc" ? 1 : -1]));
  if (Object.keys(sort).length) pipeline.push({ $sort: sort });
  else if (input.columns.some((column) => column.key === "createdAt")) pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $limit: input.limit });
  return pipeline;
}

export async function executeReportPreview(
  input: Pick<ReportDefinitionInput, "dataset" | "columns" | "filters" | "groups" | "sort" | "visualization" | "chart"> & { limit: number },
  actorId: string,
  reportId?: string,
): Promise<ReportPreviewResult> {
  const startedAt = Date.now();
  const dataset = getDataset(input.dataset);
  if (!dataset) throw new AppError("Unsupported report dataset.", 422);
  const byKey = assertDefinition(input, dataset.columns);
  const pipeline = buildPipeline(input, dataset, byKey);

  try {
    const rows = await Order.aggregate<Record<string, unknown>>(pipeline).allowDiskUse(false);
    const durationMs = Date.now() - startedAt;
    const columns: ReportPreviewColumn[] = input.columns.map((selected) => ({
      key: selected.key,
      label: selected.label,
      type: selected.type,
      aggregation: selected.aggregation,
    }));
    await Promise.all([
      ReportExecution.create({ reportId: reportId || null, dataset: input.dataset, status: "completed", rowCount: rows.length, durationMs, executedBy: actorId }),
      reportId ? ReportDefinition.updateOne({ _id: reportId }, { $set: { lastRunAt: new Date() } }) : Promise.resolve(),
    ]);
    return { rows, columns, rowCount: rows.length, durationMs, grouped: input.groups.length > 0 || input.columns.some((column) => column.aggregation !== "none") };
  } catch (error) {
    await ReportExecution.create({ reportId: reportId || null, dataset: input.dataset, status: "failed", durationMs: Date.now() - startedAt, errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown report error", executedBy: actorId });
    throw error;
  }
}
