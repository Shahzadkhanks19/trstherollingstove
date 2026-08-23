export type ReportDatasetKey = "orders" | "internal_consumption";
export type ReportColumnType = "string" | "number" | "date" | "boolean";
export type ReportFilterOperator = "eq" | "neq" | "contains" | "gte" | "lte" | "in";
export type ReportAggregation = "none" | "sum" | "avg" | "min" | "max" | "count";
export type ReportVisualization = "table" | "bar" | "line" | "pie" | "kpi";
export type ReportDateInterval = "none" | "day" | "week" | "month" | "year";

export type ReportColumnDefinition = {
  key: string;
  label: string;
  type: ReportColumnType;
  aggregation: ReportAggregation;
};

export type ReportFilterDefinition = {
  field: string;
  operator: ReportFilterOperator;
  value: string | number | boolean | string[];
};

export type ReportGroupDefinition = {
  field: string;
  interval: ReportDateInterval;
};

export type ReportChartSeries = {
  field: string;
  label: string;
};

export type ReportChartConfiguration = {
  categoryField: string;
  series: ReportChartSeries[];
  stacked: boolean;
  showLegend: boolean;
};

export type ReportDefinitionInput = {
  name: string;
  description: string;
  dataset: ReportDatasetKey;
  columns: ReportColumnDefinition[];
  filters: ReportFilterDefinition[];
  groups: ReportGroupDefinition[];
  sort: { field: string; direction: "asc" | "desc" }[];
  visualization: ReportVisualization;
  chart: ReportChartConfiguration;
  visibility: "private" | "team" | "organization";
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  templateKey: string;
};

export type ReportPreviewColumn = {
  key: string;
  label: string;
  type: ReportColumnType;
  aggregation: ReportAggregation;
};

export type ReportPreviewResult = {
  rows: Record<string, unknown>[];
  columns: ReportPreviewColumn[];
  rowCount: number;
  durationMs: number;
  grouped: boolean;
};
