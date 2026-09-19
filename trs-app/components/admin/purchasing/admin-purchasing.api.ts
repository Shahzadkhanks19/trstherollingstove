import type { ApiResponse, InventoryItem, PickupPerson, PurchaseOrder, Supplier } from "@/components/admin/purchasing/admin-purchasing.types";

async function request<T>(url:string,fallback:string,options?:RequestInit):Promise<ApiResponse<T>>{
 const response=await fetch(url,options);
 const payload=(await response.json()) as ApiResponse<T>;
 if(!response.ok||!payload.success)throw new Error(payload.message||fallback);
 return payload;
}

export async function fetchPurchasingData(canReadSuppliers:boolean,canReadInventory:boolean){
 const [orders,pickupPeople,suppliers,inventory]=await Promise.all([
  request<PurchaseOrder[]>("/api/v1/admin/purchases/orders","Unable to load purchase requests.",{cache:"no-store"}),
  request<PickupPerson[]>("/api/v1/admin/purchases/pickup-persons","Unable to load pickup people.",{cache:"no-store"}),
  canReadSuppliers?request<Supplier[]>("/api/v1/admin/suppliers","Unable to load vendors.",{cache:"no-store"}).then(x=>x.data):Promise.resolve([]),
  canReadInventory?request<InventoryItem[]>("/api/v1/admin/inventory/items","Unable to load inventory.",{cache:"no-store"}).then(x=>x.data.filter(item=>item.isActive)):Promise.resolve([]),
 ]);
 return {orders:orders.data,pickupPeople:pickupPeople.data,suppliers,inventory};
}

export async function mutatePurchasing(url:string,options?:RequestInit){
 return request<unknown>(url,"Request failed.",options);
}
