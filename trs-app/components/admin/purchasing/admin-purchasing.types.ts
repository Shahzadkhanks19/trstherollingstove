export type ApiResponse<T>={success:boolean;message:string;data:T};

export type Supplier={_id:string;name:string;code:string;contactPerson?:string;phone?:string;alternatePhone?:string;addressLine1?:string;addressLine2?:string;city?:string;state?:string;postalCode?:string;notes?:string;isActive:boolean};

export type InventoryItem={_id:string;name:string;sku:string;unit:string;currentStock:number;isActive:boolean};

export type PurchaseOrderItem={_id:string;itemName:string;sku:string;unit:string;orderedQuantity:number;receivedQuantity:number};

export type PickupPerson={_id:string;name:string;whatsappNumber:string;isActive:boolean};

export type WhatsAppDelivery={recipientType:"vendor"|"admin"|"pickup_person";destination:string;status:"queued"|"sent"|"failed"|"skipped";failureReason?:string};

export type PurchaseOrder={_id:string;purchaseOrderNumber:string;supplierId:Supplier;status:"draft"|"approved"|"partially_received"|"received"|"cancelled";orderDate:string;expectedDeliveryDate:string|null;items:PurchaseOrderItem[];notes:string;fulfilmentType:"vendor_delivery"|"self_pickup";pickupPersonName?:string;whatsappDeliveries?:WhatsAppDelivery[];cancellationReason?:string};

export type DraftLine={inventoryItemId:string;orderedQuantity:string};

export type VendorDraft={name:string;code:string;contactPerson:string;phone:string;alternatePhone:string;addressLine1:string;addressLine2:string;city:string;state:string;postalCode:string;notes:string};

export const purchasingStatuses=["all","draft","approved","partially_received","received","cancelled"] as const;
export type PurchasingStatus=(typeof purchasingStatuses)[number];
