import type { ApiEnvelope, InventoryItem, InventoryMovement, ItemForm, MovementForm, Summary } from "@/components/admin/inventory/admin-inventory.types";

function unwrap<T>(payload:ApiEnvelope<T>|T):T{return typeof payload==="object"&&payload!==null&&"data" in payload?(payload as ApiEnvelope<T>).data:payload as T}

export async function inventoryRequest<T>(url:string,init?:RequestInit):Promise<T>{
 const response=await fetch(url,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
 const payload=(await response.json()) as ApiEnvelope<T>&{error?:string};
 if(!response.ok)throw new Error(payload.message??payload.error??"Request failed.");
 return unwrap(payload);
}

export async function fetchInventoryData(){
 const [items,movements,summary]=await Promise.all([
  inventoryRequest<InventoryItem[]>("/api/v1/admin/inventory/items?includeArchived=true"),
  inventoryRequest<InventoryMovement[]>("/api/v1/admin/inventory/movements"),
  inventoryRequest<Summary>("/api/v1/admin/inventory/summary"),
 ]);
 return {items,movements,summary};
}

export function saveInventoryItem(item:InventoryItem|null,form:ItemForm){
 return inventoryRequest(item?`/api/v1/admin/inventory/items/${item._id}`:"/api/v1/admin/inventory/items",{method:item?"PATCH":"POST",body:JSON.stringify({...form,currentStock:Number(form.currentStock),reorderLevel:Number(form.reorderLevel),idealStockLevel:Number(form.idealStockLevel),averageUnitCost:Number(form.averageUnitCost)})});
}
export function archiveInventoryItem(id:string){return inventoryRequest(`/api/v1/admin/inventory/items/${id}`,{method:"DELETE"})}
export function restoreInventoryItem(id:string){return inventoryRequest(`/api/v1/admin/inventory/items/${id}`,{method:"PATCH",body:JSON.stringify({isActive:true})})}
export function permanentlyDeleteInventoryItem(id:string){return inventoryRequest(`/api/v1/admin/inventory/items/${id}?permanent=true`,{method:"DELETE"})}
export function saveInventoryMovement(form:MovementForm){return inventoryRequest("/api/v1/admin/inventory/movements",{method:"POST",body:JSON.stringify({...form,quantity:Number(form.quantity),unitCost:Number(form.unitCost),referenceType:form.type==="opening"?"opening":"manual",referenceId:null,expiryDate:form.expiryDate||null})})}
