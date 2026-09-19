import type { ApiResponse, MenuItem } from "@/components/admin/menu/admin-menu.types";
import type { DiscountType } from "@/components/admin/menu/admin-menu-discount.utils";

async function parse<T>(response:Response,fallback:string):Promise<ApiResponse<T>>{
 const payload=(await response.json()) as ApiResponse<T>;
 if(!response.ok||!payload.success)throw new Error(payload.message||fallback);
 return payload;
}

export async function patchMenuItem(itemId:string,updates:Partial<MenuItem>){
 return parse<MenuItem>(await fetch(`/api/v1/admin/menu/items/${itemId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updates)}),"Unable to update menu item.");
}

export async function bulkUpdateMenuItems(itemIds:string[],action:string){
 return parse<unknown>(await fetch("/api/v1/admin/menu/items/bulk",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemIds,action})}),"Unable to update selected items.");
}

export async function bulkDiscountMenuItems(itemIds:string[],action:"apply_discount"|"remove_discount",type:DiscountType,value:number){
 return parse<unknown>(await fetch("/api/v1/admin/menu/items/bulk",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemIds,action,...(action==="apply_discount"?{discountType:type,discountValue:value}:{})})}),"Unable to update discounts.");
}

export async function deleteMenuItem(itemId:string){
 return parse<null>(await fetch(`/api/v1/admin/menu/items/${itemId}`,{method:"DELETE"}),"Unable to delete menu item.");
}
