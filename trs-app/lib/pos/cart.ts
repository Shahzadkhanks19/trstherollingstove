import type {
  PosCartAdjustments,
  PosCartLine,
  PosCartState,
  PosCartTotals,
  PosCatalogItem,
  PosConfiguredItem,
  PosCustomer,
  PosDiscountType,
  PosOrderType,
  PosInternalConsumption,
  PosSelectedModifier,
  PosTaxMode,
} from "@/types/pos";

export const POS_CART_STORAGE_KEY = "trs:admin:pos-cart:v4";
export const POS_CART_MAX_QUANTITY = 99;
export const POS_MAX_DISCOUNT_PERCENT = 100;
export const POS_MAX_TAX_PERCENT = 100;

export const EMPTY_POS_ADJUSTMENTS: PosCartAdjustments = {
  discountType: "none",
  discountValue: 0,
  discountReason: "",
  packingCharge: 0,
  serviceCharge: 0,
  additionalCharge: 0,
  additionalChargeLabel: "Additional charge",
  taxRate: 0,
  taxMode: "exclusive",
};

export const WALK_IN_POS_CUSTOMER: PosCustomer = {
  id: "", name: "Walk-in customer", phone: "", email: "", isWalkIn: true,
};

export const EMPTY_POS_INTERNAL_CONSUMPTION: PosInternalConsumption = {
  saleType: "customer",
  referenceId: null,
  personName: "",
  reason: "",
  notes: "",
  managerApprovalEmail: "",
  managerApprovalPassword: "",
  managerApprovalReason: "",
};

export const EMPTY_POS_CART: PosCartState = {
  version: 4,
  orderType: "takeaway",
  internalConsumption: EMPTY_POS_INTERNAL_CONSUMPTION,
  lines: [],
  orderNote: "",
  customer: WALK_IN_POS_CUSTOMER,
  adjustments: EMPTY_POS_ADJUSTMENTS,
};

export function createModifierSignature(configuration: PosConfiguredItem): string {
  const modifierPart = [...configuration.modifiers]
    .sort((a, b) => `${a.groupId}:${a.optionId}`.localeCompare(`${b.groupId}:${b.optionId}`))
    .map((modifier) => `${modifier.groupId}:${modifier.optionId}:${modifier.quantity}:${sanitizeMoney(modifier.unitPrice)}`)
    .join("|");
  return [configuration.variantId ?? "base", modifierPart, configuration.specialInstructions.trim()].join("::");
}

export function createPosCartLine(item: PosCatalogItem, configuration?: PosConfiguredItem): PosCartLine {
  const normalized = configuration ?? defaultConfiguration(item);
  const signature = createModifierSignature(normalized);
  const modifierTotal = normalized.modifiers.reduce(
    (total, modifier) => total + sanitizeMoney(modifier.unitPrice) * normalizeQuantity(modifier.quantity),
    0,
  );
  return {
    lineId: createLineId(item.id, signature), itemId: item.id, source: item.source,
    name: item.name, slug: item.slug, imageUrl: item.imageUrl, categoryName: item.categoryName,
    basePrice: sanitizeMoney(normalized.basePrice), unitPrice: sanitizeMoney(normalized.basePrice + modifierTotal),
    quantity: 1, note: normalized.specialInstructions.slice(0, 240), variantId: normalized.variantId,
    variantName: normalized.variantName, modifiers: normalized.modifiers.map(normalizeModifier), modifierSignature: signature,
  };
}

export function createLineId(itemId: string, modifierSignature: string): string {
  return modifierSignature ? `${itemId}::${modifierSignature}` : itemId;
}

export function addCatalogItemToCart(state: PosCartState, item: PosCatalogItem, configuration?: PosConfiguredItem): PosCartState {
  if (!item.isAvailable || !Number.isFinite(item.price) || item.price < 0) return state;
  const line = createPosCartLine(item, configuration);
  const existingLine = state.lines.find((candidate) => candidate.lineId === line.lineId);
  if (!existingLine) return { ...state, lines: [...state.lines, line] };
  return setCartLineQuantity(state, line.lineId, existingLine.quantity + 1);
}

export function setCartLineQuantity(state: PosCartState, lineId: string, requestedQuantity: number): PosCartState {
  const quantity = normalizeQuantity(requestedQuantity);
  if (quantity === 0) return removeCartLine(state, lineId);
  let changed = false;
  const lines = state.lines.map((line) => {
    if (line.lineId !== lineId || line.quantity === quantity) return line;
    changed = true;
    return { ...line, quantity };
  });
  return changed ? { ...state, lines } : state;
}

export function changeCartLineQuantity(state: PosCartState, lineId: string, change: number): PosCartState {
  const line = state.lines.find((candidate) => candidate.lineId === lineId);
  if (!line || !Number.isFinite(change)) return state;
  return setCartLineQuantity(state, lineId, line.quantity + change);
}

export function removeCartLine(state: PosCartState, lineId: string): PosCartState {
  const lines = state.lines.filter((line) => line.lineId !== lineId);
  return lines.length === state.lines.length ? state : { ...state, lines };
}

export function updateCartLineNote(state: PosCartState, lineId: string, note: string): PosCartState {
  const normalizedNote = note.slice(0, 240);
  let changed = false;
  const lines = state.lines.map((line) => {
    if (line.lineId !== lineId || line.note === normalizedNote) return line;
    changed = true;
    return { ...line, note: normalizedNote };
  });
  return changed ? { ...state, lines } : state;
}

export function setOrderType(state: PosCartState, orderType: PosOrderType): PosCartState {
  return state.orderType === orderType ? state : { ...state, orderType };
}
export function setInternalConsumption(state: PosCartState, value: PosInternalConsumption): PosCartState {
  const internalConsumption: PosInternalConsumption = {
    saleType: value.saleType,
    referenceId: value.referenceId || null,
    personName: value.personName.trim().slice(0, 120),
    reason: value.reason.trim().slice(0, 240),
    notes: value.notes.trim().slice(0, 500),
    managerApprovalEmail: value.managerApprovalEmail.trim().toLowerCase().slice(0, 254),
    managerApprovalPassword: value.managerApprovalPassword.slice(0, 200),
    managerApprovalReason: value.managerApprovalReason.trim().slice(0, 500),
  };
  const adjustments = internalConsumption.saleType === "customer"
    ? state.adjustments
    : EMPTY_POS_ADJUSTMENTS;
  return { ...state, internalConsumption, adjustments };
}
export function setCustomer(state: PosCartState, customer: PosCustomer): PosCartState {
  return { ...state, customer: normalizeCustomer(customer) };
}
export function setOrderNote(state: PosCartState, note: string): PosCartState {
  const orderNote = note.slice(0, 500);
  return state.orderNote === orderNote ? state : { ...state, orderNote };
}
export function updateCartAdjustments(state: PosCartState, patch: Partial<PosCartAdjustments>): PosCartState {
  const adjustments = normalizeAdjustments({ ...state.adjustments, ...patch });
  return JSON.stringify(adjustments) === JSON.stringify(state.adjustments) ? state : { ...state, adjustments };
}
export function clearPosCart(state: PosCartState): PosCartState {
  if (!state.lines.length && !state.orderNote && JSON.stringify(state.adjustments) === JSON.stringify(EMPTY_POS_ADJUSTMENTS)) return state;
  return { ...EMPTY_POS_CART, orderType: state.orderType };
}

export function calculatePosCartTotals(state: PosCartState): PosCartTotals {
  const base = state.lines.reduce((totals, line) => {
    const quantity = normalizeQuantity(line.quantity);
    totals.itemCount += quantity;
    totals.distinctItemCount += 1;
    totals.subtotal += sanitizeMoney(line.unitPrice) * quantity;
    return totals;
  }, { itemCount: 0, distinctItemCount: 0, subtotal: 0 });
  const adjustments = normalizeAdjustments(state.adjustments);
  const requestedDiscount = adjustments.discountType === "percentage"
    ? base.subtotal * adjustments.discountValue / 100
    : adjustments.discountType === "fixed" ? adjustments.discountValue : 0;
  // POS settlements are collected in whole rupees. Round transaction-level
  // amounts consistently so the cart, billing modal, server order and invoice
  // cannot disagree by paise (for example ₹304.50 versus ₹305).
  const discountAmount = roundRupee(Math.min(base.subtotal, Math.max(0, requestedDiscount)));
  const netSubtotal = roundRupee(Math.max(0, base.subtotal - discountAmount));
  const packingCharge = roundRupee(adjustments.packingCharge);
  const serviceCharge = roundRupee(adjustments.serviceCharge);
  const additionalCharge = roundRupee(adjustments.additionalCharge);
  const chargesTotal = roundRupee(packingCharge + serviceCharge + additionalCharge);
  const preTaxTotal = roundRupee(netSubtotal + chargesTotal);
  const taxRate = Math.min(POS_MAX_TAX_PERCENT, Math.max(0, adjustments.taxRate));
  const taxAmount = taxRate <= 0 ? 0 : adjustments.taxMode === "inclusive"
    ? roundRupee(preTaxTotal - preTaxTotal / (1 + taxRate / 100))
    : roundRupee(preTaxTotal * taxRate / 100);
  const taxableAmount = adjustments.taxMode === "inclusive" ? roundRupee(preTaxTotal - taxAmount) : preTaxTotal;
  const grandTotal = roundRupee(adjustments.taxMode === "inclusive" ? preTaxTotal : preTaxTotal + taxAmount);
  return { ...base, subtotal: roundRupee(base.subtotal), discountAmount, netSubtotal, packingCharge,
    serviceCharge, additionalCharge, chargesTotal, taxableAmount, taxAmount, grandTotal, savings: discountAmount };
}

export function parseStoredPosCart(value: string | null): PosCartState {
  if (!value) return EMPTY_POS_CART;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || ![1, 2, 3, 4].includes(Number(parsed.version))) return EMPTY_POS_CART;
    const orderType: PosOrderType = parsed.orderType === "dine_in" ? "dine_in" : "takeaway";
    const orderNote = typeof parsed.orderNote === "string" ? parsed.orderNote.slice(0, 500) : "";
    const lines = (Array.isArray(parsed.lines) ? parsed.lines : []).flatMap((value): PosCartLine[] => {
      if (!isRecord(value)) return [];
      const itemId = asNonEmptyString(value.itemId), name = asNonEmptyString(value.name), slug = asNonEmptyString(value.slug);
      if (!itemId || !name || !slug) return [];
      const modifiers = Array.isArray(value.modifiers) ? value.modifiers.flatMap(parseModifier) : [];
      const modifierSignature = typeof value.modifierSignature === "string" ? value.modifierSignature : "";
      const quantity = normalizeQuantity(value.quantity); if (quantity === 0) return [];
      return [{ lineId: asNonEmptyString(value.lineId) ?? createLineId(itemId, modifierSignature), itemId,
        source: value.source === "pos" ? "pos" : "menu", name, slug,
        imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
        categoryName: typeof value.categoryName === "string" ? value.categoryName : "Other",
        basePrice: sanitizeMoney(value.basePrice ?? value.unitPrice), unitPrice: sanitizeMoney(value.unitPrice), quantity,
        note: typeof value.note === "string" ? value.note.slice(0, 240) : "",
        variantId: typeof value.variantId === "string" ? value.variantId : null,
        variantName: typeof value.variantName === "string" ? value.variantName : null, modifiers, modifierSignature }];
    });
    const adjustments = isRecord(parsed.adjustments) ? normalizeAdjustments(parsed.adjustments) : EMPTY_POS_ADJUSTMENTS;
    const rawInternal = isRecord(parsed.internalConsumption) ? parsed.internalConsumption : {};
    const allowedSaleTypes = new Set(["customer", "staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"]);
    const saleType = typeof rawInternal.saleType === "string" && allowedSaleTypes.has(rawInternal.saleType)
      ? rawInternal.saleType as PosInternalConsumption["saleType"]
      : "customer";
    const internalConsumption: PosInternalConsumption = {
      saleType,
      referenceId: typeof rawInternal.referenceId === "string" && rawInternal.referenceId ? rawInternal.referenceId : null,
      personName: typeof rawInternal.personName === "string" ? rawInternal.personName.slice(0, 120) : "",
      reason: typeof rawInternal.reason === "string" ? rawInternal.reason.slice(0, 240) : "",
      notes: typeof rawInternal.notes === "string" ? rawInternal.notes.slice(0, 500) : "",
      managerApprovalEmail: "",
      managerApprovalPassword: "",
      managerApprovalReason: "",
    };
    const customer = isRecord(parsed.customer) ? normalizeCustomer(parsed.customer as unknown as PosCustomer) : WALK_IN_POS_CUSTOMER;
    return { version: 4, orderType, internalConsumption, orderNote, customer, lines, adjustments: saleType === "customer" ? adjustments : EMPTY_POS_ADJUSTMENTS };
  } catch { return EMPTY_POS_CART; }
}

function normalizeCustomer(value: PosCustomer | Record<string, unknown>): PosCustomer {
  const id = typeof value.id === "string" ? value.id : "";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 80) : "Walk-in customer";
  const phone = typeof value.phone === "string" ? value.phone.trim().slice(0, 20) : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase().slice(0, 160) : "";
  return { id, name, phone, email, isWalkIn: !id || value.isWalkIn === true };
}

function defaultConfiguration(item: PosCatalogItem): PosConfiguredItem {
  const variant = item.variants.find((candidate) => candidate.isDefault && candidate.isAvailable) ?? item.variants.find((candidate) => candidate.isAvailable);
  return { variantId: variant?.id ?? null, variantName: variant?.name ?? null, basePrice: variant?.price ?? item.price, modifiers: [], specialInstructions: "" };
}
function normalizeModifier(modifier: PosSelectedModifier): PosSelectedModifier {
  return { ...modifier, quantity: Math.max(1, normalizeQuantity(modifier.quantity)), unitPrice: sanitizeMoney(modifier.unitPrice) };
}
function parseModifier(value: unknown): PosSelectedModifier[] {
  if (!isRecord(value)) return [];
  const groupId=asNonEmptyString(value.groupId), groupName=asNonEmptyString(value.groupName), optionId=asNonEmptyString(value.optionId), optionName=asNonEmptyString(value.optionName);
  if (!groupId || !groupName || !optionId || !optionName) return [];
  return [{ groupId, groupName, optionId, optionName, quantity: Math.max(1, normalizeQuantity(value.quantity)), unitPrice: sanitizeMoney(value.unitPrice) }];
}
function normalizeAdjustments(value: Partial<PosCartAdjustments> | Record<string, unknown>): PosCartAdjustments {
  const discountType: PosDiscountType = value.discountType === "fixed" || value.discountType === "percentage" ? value.discountType : "none";
  const taxMode: PosTaxMode = value.taxMode === "inclusive" ? "inclusive" : "exclusive";
  const discountValue = discountType === "percentage" ? clampMoney(value.discountValue, POS_MAX_DISCOUNT_PERCENT) : sanitizeMoney(value.discountValue);
  return { discountType, discountValue, discountReason: typeof value.discountReason === "string" ? value.discountReason.slice(0, 120) : "",
    packingCharge: sanitizeMoney(value.packingCharge), serviceCharge: sanitizeMoney(value.serviceCharge), additionalCharge: sanitizeMoney(value.additionalCharge),
    additionalChargeLabel: typeof value.additionalChargeLabel === "string" && value.additionalChargeLabel.trim() ? value.additionalChargeLabel.trim().slice(0, 60) : "Additional charge",
    taxRate: clampMoney(value.taxRate, POS_MAX_TAX_PERCENT), taxMode };
}
function clampMoney(value: unknown, max: number): number { return Math.min(max, sanitizeMoney(value)); }
function normalizeQuantity(value: unknown): number { const n=typeof value === "number" ? value : Number(value); if (!Number.isFinite(n)) return 0; return Math.max(0, Math.min(POS_CART_MAX_QUANTITY, Math.floor(n))); }
function sanitizeMoney(value: unknown): number { const n=typeof value === "number" ? value : Number(value); return Number.isFinite(n) ? roundMoney(Math.max(0, n)) : 0; }
function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function roundRupee(value: number): number { return Math.round(value + Number.EPSILON); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function asNonEmptyString(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
