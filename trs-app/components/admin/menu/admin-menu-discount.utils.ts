import type { ItemForm } from "@/components/admin/menu/admin-menu.types";

export type DiscountType = "percentage" | "fixed";

export function validateDiscount(type:DiscountType,value:string):string|null {
 const amount=Number(value);
 if(!Number.isFinite(amount)||amount<=0)return "Enter a discount greater than zero.";
 if(type==="percentage"&&amount>=100)return "Percentage discount must be less than 100%.";
 return null;
}

function discountedPrice(original:number,type:DiscountType,value:number){
 const result=type==="percentage"?original*(1-value/100):original-value;
 return Math.round((result+Number.EPSILON)*100)/100;
}

export function applyDiscountToForm(current:ItemForm,type:DiscountType,value:string):ItemForm {
 const amount=Number(value);
 if(current.variants.length){
  const variants=current.variants.map(variant=>{const original=Number(variant.compareAtPrice||variant.price);const next=discountedPrice(original,type,amount);return next<=0||next>=original?variant:{...variant,price:String(next),compareAtPrice:String(original)}});
  const defaultVariant=variants.find(v=>v.isDefault)??variants[0];
  return {...current,variants,basePrice:defaultVariant?.price??current.basePrice,compareAtPrice:defaultVariant?.compareAtPrice??current.compareAtPrice};
 }
 const original=Number(current.compareAtPrice||current.basePrice);const next=discountedPrice(original,type,amount);
 return next<=0||next>=original?current:{...current,basePrice:String(next),compareAtPrice:String(original)};
}

export function removeDiscountFromForm(current:ItemForm):ItemForm {
 const variants=current.variants.map(v=>({...v,price:v.compareAtPrice||v.price,compareAtPrice:""}));
 const defaultVariant=variants.find(v=>v.isDefault)??variants[0];
 return {...current,variants,basePrice:defaultVariant?.price??(current.compareAtPrice||current.basePrice),compareAtPrice:""};
}
