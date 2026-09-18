export type ApiEnvelope<T> = { success: boolean; message: string; data: T };
export type OrderMode = "takeaway" | "dine_in";
export type CheckoutItem = { id: string; name: string; imageUrl?: string; variant: string; modifiers: string[]; quantity: number; unitPrice: number; isCombo: boolean; isDiscountedItem: boolean };
export type CartData = { items: Array<{ _id?: string; name: string; imageUrl?: string; variantName?: string; modifiers?: Array<{ optionName?: string }>; quantity: number; lineUnitPrice: number; isCombo?: boolean; isDiscountedItem?: boolean }>; taxTotal: number };
export type CheckoutOrder = { _id?: string; id?: string; orderNumber: string };

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (value: number) => inr.format(value);

export function normaliseCart(cart: CartData | null): CheckoutItem[] {
  return (cart?.items ?? []).map((item, index) => ({
    id: item._id ?? `cart-${index}`, name: item.name, imageUrl: item.imageUrl,
    variant: item.variantName || "Regular",
    modifiers: item.modifiers?.flatMap(({ optionName }) => optionName ? [optionName] : []) ?? [],
    quantity: item.quantity, unitPrice: item.lineUnitPrice,
    isCombo: item.isCombo ?? false, isDiscountedItem: item.isDiscountedItem ?? false,
  }));
}
