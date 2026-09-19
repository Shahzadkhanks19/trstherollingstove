import type { Types } from "mongoose";

export type ModifierInput = { groupId:string; groupName?:string; optionId:string; optionName?:string; quantity:number };
export type AdjustmentsInput = { discountType:"none"|"fixed"|"percentage"; discountValue:number; discountReason:string; packingCharge:number; serviceCharge:number; additionalCharge:number; additionalChargeLabel:string; taxRate:number; taxMode:"exclusive"|"inclusive" };
export type ResolvedModifier = { groupId:Types.ObjectId; groupName:string; optionId:Types.ObjectId; optionName:string; unitPrice:number; quantity:number };
export type ModifierVariantPriceRecord = { variantLabel:string; price:number };
export type ModifierOptionRecord = { _id:Types.ObjectId; name:string; price?:number; maxQuantity?:number; isActive:boolean; isAvailable:boolean; variantPrices?:ModifierVariantPriceRecord[] };
export type ModifierGroupRecord = { _id:Types.ObjectId; name:string; minSelections?:number; maxSelections?:number; selectionType?:string; isRequired?:boolean; options:ModifierOptionRecord[] };
