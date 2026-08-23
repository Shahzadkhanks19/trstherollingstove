import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const PrintJobSchema = new Schema({
  documentType: { type: String, enum: ["invoice", "kot", "revision_kot", "report"], required: true, index: true },
  entityType: { type: String, enum: ["invoice", "running_order", "order", "cash_register", "sales_report"], required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  orderNumber: { type: String, trim: true, maxlength: 80, default: "", index: true },
  label: { type: String, trim: true, maxlength: 160, required: true },
  printUrl: { type: String, trim: true, maxlength: 1000, required: true },
  paper: { type: String, enum: ["a4", "58mm", "80mm"], default: "80mm" },
  copies: { type: Number, min: 1, max: 10, default: 1 },
  status: { type: String, enum: ["requested", "opened", "printed", "failed"], default: "requested", index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  requestedAt: { type: Date, default: Date.now, index: true },
  openedAt: { type: Date, default: null },
  printedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  failureReason: { type: String, trim: true, maxlength: 500, default: "" },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

PrintJobSchema.index({ requestedAt: -1, status: 1 });
export type PrintJobDocument = InferSchemaType<typeof PrintJobSchema>;
export const PrintJob: Model<PrintJobDocument> = (models.PrintJob as Model<PrintJobDocument>) || model<PrintJobDocument>("PrintJob", PrintJobSchema);
