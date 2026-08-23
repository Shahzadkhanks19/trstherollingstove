import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FavoriteItemSchema = new Schema({ itemId: { type: Schema.Types.ObjectId, default: null }, name: { type: String, required: true, trim: true }, quantity: { type: Number, min: 0, default: 0 }, revenue: { type: Number, min: 0, default: 0 } }, { _id: false });
const CustomerInsightSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  lifetimeValue: { type: Number, min: 0, default: 0 }, orderCount: { type: Number, min: 0, default: 0 }, completedOrderCount: { type: Number, min: 0, default: 0 }, cancelledOrderCount: { type: Number, min: 0, default: 0 },
  averageOrderValue: { type: Number, min: 0, default: 0 }, visitFrequencyDays: { type: Number, min: 0, default: 0 }, daysSinceLastOrder: { type: Number, min: 0, default: 0 },
  lastOrderAt: { type: Date, default: null }, firstOrderAt: { type: Date, default: null }, reservationCount: { type: Number, min: 0, default: 0 }, completedReservationCount: { type: Number, min: 0, default: 0 }, noShowCount: { type: Number, min: 0, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 }, averageRating: { type: Number, min: 0, max: 5, default: 0 }, referralCount: { type: Number, min: 0, default: 0 }, coinsEarned: { type: Number, min: 0, default: 0 }, coinsRedeemed: { type: Number, min: 0, default: 0 },
  favoriteItems: { type: [FavoriteItemSchema], default: [] }, preferredOrderMode: { type: String, enum: ["dine_in", "takeaway", "none"], default: "none" }, preferredVisitHour: { type: Number, min: 0, max: 23, default: null }, preferredTable: { type: String, trim: true, maxlength: 30, default: "" },
  segmentKeys: { type: [String], default: [], index: true }, riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low", index: true }, engagementScore: { type: Number, min: 0, max: 100, default: 0 }, generatedAt: { type: Date, required: true, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });
CustomerInsightSchema.index({ lifetimeValue: -1, completedOrderCount: -1 });
CustomerInsightSchema.index({ segmentKeys: 1, generatedAt: -1 });
export type CustomerInsightDocument = InferSchemaType<typeof CustomerInsightSchema>;
export const CustomerInsight: Model<CustomerInsightDocument> = (models.CustomerInsight as Model<CustomerInsightDocument>) || model<CustomerInsightDocument>("CustomerInsight", CustomerInsightSchema);
