import type { Types } from "mongoose";

export type ModifierInput = { groupId:string; groupName?:string; optionId:string; optionName?:string; quantity:number };
export type AdjustmentsInput = { discountType:"none"|"fixed"|"percentage"; discountValue:number; discountReason:string; packingCharge:number; serviceCharge:number; additionalCharge:number; additionalChargeLabel:string; taxRate:number; taxMode:"exclusive"|"inclusive" };
export type ResolvedModifier = { groupId:Types.ObjectId; groupName:string; optionId:Types.ObjectId; optionName:string; unitPrice:number; quantity:number };
export type ModifierVariantPriceRecord = { variantLabel:string; price:number };
export type ModifierOptionRecord = { _id:Types.ObjectId; name:string; price?:number; maxQuantity?:number; isActive:boolean; isAvailable:boolean; variantPrices?:ModifierVariantPriceRecord[] };
export type ModifierGroupRecord = { _id:Types.ObjectId; name:string; minSelections?:number; maxSelections?:number; selectionType?:string; isRequired?:boolean; options:ModifierOptionRecord[] };

export type ResolvedPosLine = { sourceType:"menu"|"pos"; menuItemId:Types.ObjectId|null; posItemId:Types.ObjectId|null; categoryId:Types.ObjectId|null; name:string; imageUrl:string; variantId:Types.ObjectId|null; variantName:string; baseUnitPrice:number; modifiers:ResolvedModifier[]; quantity:number; specialInstructions:string; lineUnitPrice:number; lineTotal:number; sendToKds:boolean; stationId:Types.ObjectId|null };
export type KitchenOrderItemRecord = { _id:Types.ObjectId; menuItemId?:Types.ObjectId|null; posItemId?:Types.ObjectId|null; variantId?:Types.ObjectId|null };
export type KitchenOrderRecord = { _id:Types.ObjectId; orderNumber:string; orderMode:"dine_in"|"takeaway"; tableNumber?:string; customerSnapshot?:{name:string;phone?:string;email?:string}|null; items:KitchenOrderItemRecord[]; orderTakerName?:string };

export type CreatePosOrderInput = {
  shiftId: string;
  orderMode: "dine_in" | "takeaway";
  internalConsumption: {
    saleType:
      | "customer"
      | "staff_meal"
      | "family_meal"
      | "complimentary"
      | "food_wastage"
      | "kitchen_test";
    referenceId: string | null;
    personName: string;
    reason: string;
    notes: string;
    managerApprovalEmail: string;
    managerApprovalPassword: string;
    managerApprovalReason: string;
  };
  tableNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  paymentMethod: "cash" | "upi" | "split";
  paymentBreakdown: Array<{
    method: "cash" | "upi";
    amount: number;
    reference: string;
  }>;
  waivedAmount: number;
  waivedReason: string;
  tipAmount: number;
  tipMethod: "none" | "cash" | "upi";
  tipCollection: "none" | "waiter_direct" | "restaurant";
  orderTakerName: string;
  upiReference: string;
  amountTendered: number;
  adjustments: AdjustmentsInput;
  items: Array<{
    sourceType: "menu" | "pos";
    itemId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice?: number;
    specialInstructions: string;
    modifiers: ModifierInput[];
  }>;
};

