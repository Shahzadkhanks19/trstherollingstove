import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const ReportColumnSchema = new Schema({
  key: { type: String, required: true, trim: true, maxlength: 100 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ["string", "number", "date", "boolean"], required: true },
  aggregation: { type: String, enum: ["none", "sum", "avg", "min", "max", "count"], default: "none" },
}, { _id: false });

const ReportFilterSchema = new Schema({
  field: { type: String, required: true, trim: true, maxlength: 100 },
  operator: { type: String, enum: ["eq", "neq", "contains", "gte", "lte", "in"], required: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { _id: false });

const ReportGroupSchema = new Schema({
  field: { type: String, required: true, trim: true, maxlength: 100 },
  interval: { type: String, enum: ["none", "day", "week", "month", "year"], default: "none" },
}, { _id: false });

const ReportSortSchema = new Schema({
  field: { type: String, required: true, trim: true, maxlength: 100 },
  direction: { type: String, enum: ["asc", "desc"], default: "desc" },
}, { _id: false });

const ReportChartSeriesSchema = new Schema({
  field: { type: String, required: true, trim: true, maxlength: 100 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
}, { _id: false });

const ReportChartSchema = new Schema({
  categoryField: { type: String, trim: true, maxlength: 100, default: "" },
  series: { type: [ReportChartSeriesSchema], default: [] },
  stacked: { type: Boolean, default: false },
  showLegend: { type: Boolean, default: true },
}, { _id: false });

const ReportDefinitionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120, index: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  dataset: { type: String, enum: ["orders", "internal_consumption"], required: true, index: true },
  columns: { type: [ReportColumnSchema], required: true, validate: [(value: unknown[]) => value.length > 0 && value.length <= 30, "Select between 1 and 30 columns."] },
  filters: { type: [ReportFilterSchema], default: [] },
  groups: { type: [ReportGroupSchema], default: [] },
  sort: { type: [ReportSortSchema], default: [] },
  visualization: { type: String, enum: ["table", "bar", "line", "pie", "kpi"], default: "table" },
  chart: { type: ReportChartSchema, default: () => ({ categoryField: "", series: [], stacked: false, showLegend: true }) },
  visibility: { type: String, enum: ["private", "team", "organization"], default: "private", index: true },
  tags: { type: [String], default: [] },
  isFavorite: { type: Boolean, default: false, index: true },
  isPinned: { type: Boolean, default: false, index: true },
  templateKey: { type: String, trim: true, maxlength: 80, default: "" },
  isArchived: { type: Boolean, default: false, index: true },
  version: { type: Number, min: 1, default: 1 },
  lastRunAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });

ReportDefinitionSchema.index({ createdBy: 1, isArchived: 1, updatedAt: -1 });
ReportDefinitionSchema.index({ visibility: 1, isArchived: 1, updatedAt: -1 });
ReportDefinitionSchema.index({ name: "text", description: "text", tags: "text" });

export type ReportDefinitionDocument = InferSchemaType<typeof ReportDefinitionSchema>;
export const ReportDefinition: Model<ReportDefinitionDocument> =
  (models.ReportDefinition as Model<ReportDefinitionDocument>) || model<ReportDefinitionDocument>("ReportDefinition", ReportDefinitionSchema);
