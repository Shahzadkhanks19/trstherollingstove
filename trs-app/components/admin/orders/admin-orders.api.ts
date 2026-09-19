import type { AdminOrder, AdminOrderListPayload, AdminOrderStatus, AdminPaymentMethod, AdminPaymentStatus } from "@/types/adminOrders";

export type ApiResponse<T>={success:boolean;message:string;data:T};
export type SortField="createdAt"|"grandTotal"|"orderNumber"|"status"|"paymentStatus";
export type SortOrder="asc"|"desc";

export const money=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2});
export const dateTime=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"});
export const statusLabels:Record<AdminOrderStatus,string>={placed:"Pending",accepted:"Confirmed",preparing:"Preparing",ready:"Ready",completed:"Completed",cancelled:"Cancelled",rejected:"Rejected"};
export const statusTone:Record<AdminOrderStatus,string>={placed:"bg-orange-50 text-orange-700 ring-orange-200",accepted:"bg-sky-50 text-sky-700 ring-sky-200",preparing:"bg-amber-50 text-amber-700 ring-amber-200",ready:"bg-indigo-50 text-indigo-700 ring-indigo-200",completed:"bg-emerald-50 text-emerald-700 ring-emerald-200",cancelled:"bg-red-50 text-red-700 ring-red-200",rejected:"bg-rose-50 text-rose-700 ring-rose-200"};
export const nextStatuses:Record<AdminOrderStatus,AdminOrderStatus[]>={placed:["accepted","cancelled","rejected"],accepted:["preparing","cancelled"],preparing:["ready","cancelled"],ready:["completed"],completed:[],cancelled:[],rejected:[]};
export const tabs:Array<{value:"all"|AdminOrderStatus;label:string}>=[{value:"all",label:"All"},{value:"placed",label:"Pending"},{value:"accepted",label:"Confirmed"},{value:"preparing",label:"Preparing"},{value:"ready",label:"Ready"},{value:"completed",label:"Completed"},{value:"cancelled",label:"Cancelled"}];

async function request<T>(url:string,fallback:string,init?:RequestInit):Promise<T>{const response=await fetch(url,init);const payload=(await response.json()) as ApiResponse<T>;if(!response.ok||!payload.success)throw new Error(payload.message||fallback);return payload.data}
export function fetchAdminOrders(query:string){return request<AdminOrderListPayload>(`/api/v1/admin/orders?${query}`,"Unable to load orders.",{cache:"no-store"})}
export function fetchAdminOrder(id:string){return request<AdminOrder>(`/api/v1/admin/orders/${id}`,"Unable to load order.",{cache:"no-store"})}
export function patchAdminOrderStatus(id:string,status:AdminOrderStatus,note:string){return request<AdminOrder>(`/api/v1/admin/orders/${id}/status`,"Unable to update order status.",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,note})})}
export function patchAdminOrderPayment(id:string,paymentStatus:AdminPaymentStatus,paymentMethod:AdminPaymentMethod,transactionId:string){return request<AdminOrder>(`/api/v1/admin/orders/${id}/payment`,"Unable to update payment.",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentStatus,paymentMethod,transactionId})})}
