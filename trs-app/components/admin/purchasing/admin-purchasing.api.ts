import type { ApiResponse, InventoryItem, PickupPerson, PurchaseOrder, Supplier } from "@/components/admin/purchasing/admin-purchasing.types";

async function parse<T>(response:Response,fallback:string):Promise<ApiResponse<T>>{
 const payload=(await response.json()) as ApiResponse<T>;
 if(!response.ok||!payload.success)throw new Error(payload.message||fallback);
 return payload;
}

export async function fetchPurchasingData(canReadSuppliers:boolean,canReadInventory:boolean){
 const orders=await parse<PurchaseOrder[]>(await fetch("/api/v1/admin/purchases/orders",{cache:"no-store"}),"Unable to load purchase requests.");
 const pickupPeople=await parse<PickupPerson[]>(await fetch("/api/v1/admin/purchases/pickup-persons",{cache:"no-store"}),"Unable to load pickup people.");
 const [suppliers,inventory]=await Promise.all([
  canReadSuppliers?parse<Supplier[]>(await fetch("/api/v1/admin/suppliers",{cache:"no-store"}),"Unable to load vendors.").then(x=>x.data):Promise.resolve([]),
  canReadInventory?parse<InventoryItem[]>(await fetch("/api/v1/admin/inventory/items",{cache:"no-store"}),"Unable to load inventory.").then(x=>x.data.filter(item=>item.isActive)):Promise.resolve([]),
 ]);
 return {orders:orders.data,pickupPeople:pickupPeople.data,suppliers,inventory};
}

export async function mutatePurchasing(url:string,options?:RequestInit){
 return parse<unknown>(await fetch(url,options),"Request failed.");
}
