import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const KitchenRoutingRuleSchema = new Schema(
  {
    stationId: {
      type: Schema.Types.ObjectId,
      ref: "KitchenStation",
      required: true,
      index: true,
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      default: null,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "MenuCategory",
      default: null,
      index: true,
    },
    priority: {
      type: Number,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

KitchenRoutingRuleSchema.index(
  {
    stationId: 1,
    menuItemId: 1,
    categoryId: 1,
  },
  {
    unique: true,
  },
);

export type KitchenRoutingRuleDocument =
  InferSchemaType<typeof KitchenRoutingRuleSchema>;

export const KitchenRoutingRule:
  Model<KitchenRoutingRuleDocument> =
    (models.KitchenRoutingRule as Model<KitchenRoutingRuleDocument>) ||
    model<KitchenRoutingRuleDocument>(
      "KitchenRoutingRule",
      KitchenRoutingRuleSchema,
    );
