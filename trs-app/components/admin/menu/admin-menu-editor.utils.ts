import type { Category, ItemForm, MenuItem, ModifierGroup, VariantForm } from "@/components/admin/menu/admin-menu.types";
import { createNaanPortionVariants, createPizzaVariants, isComboCategory, isNaanCategory, isPizzaCategory } from "@/components/admin/menu/admin-menu.utils";
import { isAllowedNaanModifierGroup, isThinCrustExcludedPizza } from "@/lib/menu-special-config";
import { localDateTimeInputValue } from "@/lib/validation/dateTime";

export function createMenuItemForm(categories: Array<{_id:string;name:string;slug:string;isActive:boolean}>): ItemForm {
  const category=categories.find(c=>c.isActive);
  const pizza=Boolean(category&&isPizzaCategory(categories,category._id));
  const naan=Boolean(category&&isNaanCategory(categories,category._id));
  return {...structuredClone(emptyBase()),categoryId:category?._id??"",variants:pizza?createPizzaVariants():naan?createNaanPortionVariants():[],pizzaConfiguration:{thinCrustAvailable:true,thinCrustPriceAdjustment:"0"}};
}

function emptyBase(): ItemForm {
 return {name:"",slug:"",categoryId:"",shortDescription:"",description:"",imageUrl:"",basePrice:"",compareAtPrice:"",variants:[],modifierGroupIds:[],frequentlyOrderedWithIds:[],combinationPricing:{enabled:false,modifierGroupId:"",entries:[]},pizzaConfiguration:{thinCrustAvailable:true,thinCrustPriceAdjustment:"0"},spiceLevel:"medium",preparationTimeMinutes:"15",tags:"",allergens:"",availableForDineIn:true,availableForTakeaway:true,isAvailable:true,isActive:true,isFeatured:false,isBestseller:false,isCombo:false,comboComponents:[],comboOfferType:"permanent",comboOfferStartsAt:"",comboOfferExpiresAt:"",publishComboOnMenuPage:true,publishComboOnOffersPage:false,comboOffersPageSection:"permanent",eligibleTierKeys:["bronze","silver","gold","platinum"],isTodaysSpecialOffer:false,todaysSpecialOfferStartsAt:"",trackInventory:false,sortOrder:"0"};
}

export function menuItemToForm(item:MenuItem,categories: Category[]):ItemForm {
 const categoryId=typeof item.categoryId==="string"?item.categoryId:item.categoryId._id;
 const pizza=isPizzaCategory(categories,categoryId), naan=isNaanCategory(categories,categoryId);
 return {name:item.name,slug:item.slug,categoryId,shortDescription:item.shortDescription??"",description:item.description??"",imageUrl:item.imageUrl??"",basePrice:String(item.basePrice),compareAtPrice:item.compareAtPrice==null?"":String(item.compareAtPrice),variants:(pizza||naan)&&(item.variants??[]).length===0?(pizza?createPizzaVariants():createNaanPortionVariants()):(item.variants??[]).map((v,i)=>({name:v.name,sku:v.sku??"",price:String(v.price),compareAtPrice:v.compareAtPrice==null?"":String(v.compareAtPrice),isDefault:v.isDefault??i===0,isActive:v.isActive??true,sortOrder:String(v.sortOrder??i)})),modifierGroupIds:(item.modifierGroupIds??[]).map(g=>typeof g==="string"?g:g._id),frequentlyOrderedWithIds:(item.frequentlyOrderedWithIds??[]).flatMap(r=>!r?[]:typeof r==="string"?[r]:r.isActive!==false?[r._id]:[]),combinationPricing:{enabled:item.combinationPricing?.enabled??false,modifierGroupId:item.combinationPricing?.modifierGroupId??"",entries:(item.combinationPricing?.entries??[]).map(e=>({...e,price:String(e.price)}))},pizzaConfiguration:{thinCrustAvailable:item.pizzaConfiguration?.thinCrustAvailable??!isThinCrustExcludedPizza(item.name),thinCrustPriceAdjustment:String(item.pizzaConfiguration?.thinCrustPriceAdjustment??0)},spiceLevel:item.spiceLevel,preparationTimeMinutes:String(item.preparationTimeMinutes),tags:item.tags.join(", "),allergens:item.allergens.join(", "),availableForDineIn:item.availableForDineIn,availableForTakeaway:item.availableForTakeaway,isAvailable:item.isAvailable,isActive:item.isActive,isFeatured:item.isFeatured,isBestseller:item.isBestseller,isCombo:item.isCombo??false,comboComponents:(item.comboComponents??[]).map(e=>({menuItemId:typeof e.menuItemId==="string"?e.menuItemId:e.menuItemId._id,variantId:e.variantId??"",quantity:String(e.quantity)})),comboOfferType:item.comboOfferType??"permanent",comboOfferStartsAt:item.comboOfferStartsAt?localDateTimeInputValue(new Date(item.comboOfferStartsAt)):"",comboOfferExpiresAt:item.comboOfferExpiresAt?localDateTimeInputValue(new Date(item.comboOfferExpiresAt)):"",publishComboOnMenuPage:item.publishComboOnMenuPage??true,publishComboOnOffersPage:item.publishComboOnOffersPage??false,comboOffersPageSection:item.comboOffersPageSection??"permanent",eligibleTierKeys:item.eligibleTierKeys?.length?item.eligibleTierKeys:["bronze","silver","gold","platinum"],isTodaysSpecialOffer:item.isTodaysSpecialOffer??false,todaysSpecialOfferStartsAt:item.todaysSpecialOfferStartsAt?localDateTimeInputValue(new Date(item.todaysSpecialOfferStartsAt)):"",trackInventory:item.trackInventory,sortOrder:String(item.sortOrder)};
}

export function changeMenuCategory(current:ItemForm,value:string,categories: Category[],groups:ModifierGroup[]):ItemForm {
 const pizza=isPizzaCategory(categories,value),naan=isNaanCategory(categories,value),combo=isComboCategory(categories,value);
 return {...current,categoryId:value,basePrice:pizza||naan?"":current.basePrice,isCombo:combo,comboComponents:combo?(current.comboComponents.length>=2?current.comboComponents:[{menuItemId:"",variantId:"",quantity:"1"},{menuItemId:"",variantId:"",quantity:"1"}]):[],variants:pizza?(current.variants.length?current.variants:createPizzaVariants()):naan?(current.variants.length?current.variants:createNaanPortionVariants()):[],combinationPricing:naan?current.combinationPricing:{enabled:false,modifierGroupId:"",entries:[]},modifierGroupIds:naan?current.modifierGroupIds.filter(id=>{const g=groups.find(x=>x._id===id);return Boolean(g&&isAllowedNaanModifierGroup(g.name,g.internalName))}):current.modifierGroupIds,pizzaConfiguration:pizza?current.pizzaConfiguration:{thinCrustAvailable:false,thinCrustPriceAdjustment:"0"}};
}

export function changeVariant(current:ItemForm,index:number,updates:Partial<VariantForm>):ItemForm {
 const previous=current.variants[index]?.name??"";const variants=current.variants.map((v,i)=>i===index?{...v,...updates}:updates.isDefault?{...v,isDefault:false}:v);const next=variants[index]?.name??previous;
 return {...current,variants,combinationPricing:{...current.combinationPricing,entries:current.combinationPricing.entries.map(e=>e.variantLabel===previous?{...e,variantLabel:next}:e)}};
}


export function selectCombinationPricingGroup(current:ItemForm,groupId:string,groups:ModifierGroup[]):ItemForm {
 const group=groups.find(entry=>entry._id===groupId);
 const entries=group?current.variants.flatMap(variant=>group.options.filter(option=>option._id&&option.isActive&&option.isAvailable!==false).map(option=>current.combinationPricing.entries.find(entry=>entry.variantLabel===variant.name&&entry.optionId===option._id)??{variantLabel:variant.name,optionId:option._id as string,optionName:option.name,price:""})):[];
 return {...current,modifierGroupIds:groupId&&!current.modifierGroupIds.includes(groupId)?[...current.modifierGroupIds,groupId]:current.modifierGroupIds,combinationPricing:{enabled:Boolean(groupId),modifierGroupId:groupId,entries}};
}

export function changeCombinationPrice(current:ItemForm,variantLabel:string,optionId:string,price:string):ItemForm {
 return {...current,combinationPricing:{...current.combinationPricing,entries:current.combinationPricing.entries.map(entry=>entry.variantLabel===variantLabel&&entry.optionId===optionId?{...entry,price}:entry)}};
}

export function calculateComboPricing(form:ItemForm,items:MenuItem[]){
 const originalPrice=form.comboComponents.reduce((sum,entry)=>{const item=items.find(candidate=>candidate._id===entry.menuItemId);if(!item)return sum;const variant=item.variants.find(candidate=>candidate._id===entry.variantId);return sum+(variant?.price??item.basePrice)*Math.max(0,Number(entry.quantity)||0)},0);
 const sellingPrice=Number(form.basePrice)||0;const savings=Math.max(0,originalPrice-sellingPrice);
 return {originalPrice,savings,discount:originalPrice>0?(savings/originalPrice)*100:0};
}
