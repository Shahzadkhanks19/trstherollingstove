import type { ApiResponse, Category, MenuItem, ModifierGroup } from "@/components/admin/menu/admin-menu.types";
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


export async function fetchMenuItems(query:string){
 return parse<MenuItem[]>(await fetch(`/api/v1/admin/menu/items?${query}`,{cache:"no-store"}),"Unable to load menu items.");
}

export async function fetchComboCatalogItems(){
 const items:MenuItem[]=[];let page=1,totalPages=1;
 do {
  const params=new URLSearchParams({page:String(page),limit:"100",isActive:"true"});
  const payload=await parse<MenuItem[]>(await fetch(`/api/v1/admin/menu/items?${params.toString()}`,{cache:"no-store"}),"Unable to load combo menu items.");
  items.push(...payload.data.filter(item=>!item.isCombo));
  totalPages=Math.max(1,payload.meta?.totalPages??1);page+=1;
 } while(page<=totalPages);
 return items;
}

async function fetchCategories(){
 return (await parse<Category[]>(await fetch("/api/v1/admin/menu/categories?includeInactive=true",{cache:"no-store"}),"Unable to load menu categories.")).data;
}

export async function fetchMenuCategories(canCreate:boolean){
 let categories=await fetchCategories();
 const hasCombo=categories.some(category=>category.isActive&&(category.slug==="combos"||category.name.trim().toLowerCase()==="combos"));
 if(!hasCombo&&canCreate){
  await parse<unknown>(await fetch("/api/v1/admin/menu/categories/seed",{method:"POST"}),"Unable to install the default TRS categories.");
  categories=await fetchCategories();
 }
 return categories;
}

export async function fetchModifierGroups(){
 return (await parse<ModifierGroup[]>(await fetch("/api/v1/admin/menu/modifier-groups",{cache:"no-store"}),"Unable to load add-on groups.")).data;
}

export async function fetchMenuItem(itemId:string){
 return (await parse<MenuItem>(await fetch(`/api/v1/admin/menu/items/${itemId}`,{cache:"no-store"}),"Unable to load menu item.")).data;
}

export async function uploadMenuImage(file:File){
 const body=new FormData();body.append("file",file);
 return (await parse<{url:string}>(await fetch("/api/v1/admin/uploads/menu",{method:"POST",body}),"Image upload failed.")).data.url;
}


export async function saveMenuItem(itemId:string|null,body:unknown){
 return parse<MenuItem>(await fetch(itemId?`/api/v1/admin/menu/items/${itemId}`:"/api/v1/admin/menu/items",{method:itemId?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),"Unable to save menu item.");
}
