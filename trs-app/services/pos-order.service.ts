import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { verifyPassword } from "@/lib/auth/password";
import { resolveVariantModifierPrice } from "@/lib/menu-pricing";
import {
  MIXED_NAAN_GROUP_ID,
  MIXED_NAAN_GROUP_NAME,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";
import {
  isMediumPizzaVariant,
  isThinCrustEnabled,
  thinCrustGroupId,
  thinCrustOptionId,
} from "@/lib/menu-special-config";
import { InventoryItem } from "@/models/InventoryItem";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Invoice } from "@/models/Invoice";
import { MenuItem } from "@/models/MenuItem";
import { MenuItemRecipe } from "@/models/MenuItemRecipe";
import { ModifierGroup } from "@/models/ModifierGroup";
import { Order } from "@/models/Order";
import { POSCashMovement } from "@/models/POSCashMovement";
import { POSItem } from "@/models/POSItem";
import { POSItemRecipe } from "@/models/POSItemRecipe";
import { POSShift } from "@/models/POSShift";
import { StaffProfile } from "@/models/StaffProfile";
import { User } from "@/models/User";
import { getOrCreateInvoice } from "@/services/invoice.service";
import { getRoleWithPermissions } from "@/services/rbac.service";
import { createKitchenTicketsFromOrder } from "@/services/kds.service";
import {
  publishDashboardRefresh,
  publishKdsQueueUpdated,
  publishOrderCreated,
} from "@/services/realtimeEvents.service";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function wholeRupee(value: number) {
  return Math.round(value + Number.EPSILON);
}


type ModifierInput = { groupId: string; groupName?: string; optionId: string; optionName?: string; quantity: number };
type AdjustmentsInput = {
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  discountReason: string;
  packingCharge: number;
  serviceCharge: number;
  additionalCharge: number;
  additionalChargeLabel: string;
  taxRate: number;
  taxMode: "exclusive" | "inclusive";
};
type CreatePosOrderInput = {
  shiftId: string;
  orderMode: "dine_in" | "takeaway";
  internalConsumption: {
    saleType: "customer" | "staff_meal" | "family_meal" | "complimentary" | "food_wastage" | "kitchen_test";
    referenceId: string | null;
    personName: string;
    reason: string;
    notes: string;
    managerApprovalEmail: string;
    managerApprovalPassword: string;
    managerApprovalReason: string;
  };
  tableNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  paymentMethod: "cash" | "upi" | "split";
  paymentBreakdown: Array<{ method: "cash" | "upi"; amount: number; reference: string }>;
  waivedAmount: number;
  waivedReason: string;
  tipAmount: number;
  tipMethod: "none" | "cash" | "upi";
  tipCollection: "none" | "waiter_direct" | "restaurant";
  orderTakerName: string;
  upiReference: string;
  amountTendered: number;
  adjustments: AdjustmentsInput;
  items: Array<{
    sourceType: "menu" | "pos";
    itemId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice?: number;
    specialInstructions: string;
    modifiers: ModifierInput[];
  }>;
};

type ResolvedModifier = {
  groupId: Types.ObjectId;
  groupName: string;
  optionId: Types.ObjectId;
  optionName: string;
  unitPrice: number;
  quantity: number;
};
type ResolvedPosLine = {
  sourceType: "menu" | "pos";
  menuItemId: Types.ObjectId | null;
  posItemId: Types.ObjectId | null;
  categoryId: Types.ObjectId | null;
  name: string;
  imageUrl: string;
  variantId: Types.ObjectId | null;
  variantName: string;
  baseUnitPrice: number;
  modifiers: ResolvedModifier[];
  quantity: number;
  specialInstructions: string;
  lineUnitPrice: number;
  lineTotal: number;
  sendToKds: boolean;
  stationId: Types.ObjectId | null;
};

type ModifierVariantPriceRecord = {
  variantLabel: string;
  price: number;
};

type ModifierOptionRecord = {
  _id: Types.ObjectId;
  name: string;
  price?: number;
  maxQuantity?: number;
  isActive: boolean;
  isAvailable: boolean;
  variantPrices?: ModifierVariantPriceRecord[];
};

type ModifierGroupRecord = {
  _id: Types.ObjectId;
  name: string;
  minSelections?: number;
  maxSelections?: number;
  selectionType?: string;
  isRequired?: boolean;
  options: ModifierOptionRecord[];
};

type KitchenOrderItemRecord = {
  _id: Types.ObjectId;
  menuItemId?: Types.ObjectId | null;
  posItemId?: Types.ObjectId | null;
  variantId?: Types.ObjectId | null;
};

type KitchenOrderRecord = {
  _id: Types.ObjectId;
  orderNumber: string;
  orderMode: "dine_in" | "takeaway";
  tableNumber?: string;
  customerSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
  } | null;
  items: KitchenOrderItemRecord[];
  orderTakerName?: string;
};

export async function createPosOrder(input: CreatePosOrderInput, actorId: string) {
  const shift = await POSShift.findOne({
    _id: input.shiftId,
    status: "open",
    openedBy: new Types.ObjectId(actorId),
  }).lean();
  if (!shift) throw new AppError("Open POS shift not found for this cashier.", 409);

  const isInternalOrder = input.internalConsumption.saleType !== "customer";
  if (isInternalOrder && !input.internalConsumption.personName.trim()) {
    throw new AppError("Select or enter the person/name for this internal order.", 422);
  }
  if (isInternalOrder && !input.internalConsumption.reason.trim()) {
    throw new AppError("Reason is required for internal consumption.", 422);
  }
  let approvalStatus: "not_required" | "required" | "approved" = "not_required";
  let approvalReason = "";
  let approvedBy: Types.ObjectId | null = null;
  let approvedAt: Date | null = null;
  let dailyUsageBefore = 0;
  let monthlyUsageBefore = 0;
  let dailyLimit = 0;
  let monthlyLimit = 0;

  if (input.internalConsumption.saleType === "staff_meal") {
    if (!input.internalConsumption.referenceId) throw new AppError("Select a staff member.", 422);
    const staffUser = await User.findOne({ _id: input.internalConsumption.referenceId, deletedAt: null, isActive: true }).select("_id name").lean();
    if (!staffUser) throw new AppError("Selected staff member is no longer active.", 409);
    if (staffUser.name !== input.internalConsumption.personName.trim()) input.internalConsumption.personName = staffUser.name;

    const profile = await StaffProfile.findOne({ userId: staffUser._id }).lean();
    if (!profile || profile.mealEligible === false) throw new AppError("This staff member is not eligible for staff meals.", 409);
    if (profile.mealSuspendedUntil && new Date(profile.mealSuspendedUntil) > new Date()) {
      throw new AppError(`Staff meal access is suspended until ${new Date(profile.mealSuspendedUntil).toLocaleDateString("en-IN")}. ${profile.mealSuspensionReason || ""}`.trim(), 409);
    }
    dailyLimit = profile.dailyMealLimit ?? 2;
    monthlyLimit = profile.monthlyMealLimit ?? 60;
    const weeklyLimit = profile.weeklyMealLimit ?? 14;
    const yearlyLimit = profile.yearlyMealLimit ?? 720;
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [dailyCount, weeklyCount, monthlyCount, yearlyCount] = await Promise.all([
      Order.countDocuments({ saleType: "staff_meal", "internalConsumption.referenceId": staffUser._id, status: { $nin: ["cancelled", "rejected"] }, createdAt: { $gte: dayStart } }),
      Order.countDocuments({ saleType: "staff_meal", "internalConsumption.referenceId": staffUser._id, status: { $nin: ["cancelled", "rejected"] }, createdAt: { $gte: weekStart } }),
      Order.countDocuments({ saleType: "staff_meal", "internalConsumption.referenceId": staffUser._id, status: { $nin: ["cancelled", "rejected"] }, createdAt: { $gte: monthStart } }),
      Order.countDocuments({ saleType: "staff_meal", "internalConsumption.referenceId": staffUser._id, status: { $nin: ["cancelled", "rejected"] }, createdAt: { $gte: yearStart } }),
    ]);
    dailyUsageBefore = dailyCount;
    monthlyUsageBefore = monthlyCount;
    const limitExceeded = profile.unlimitedMeals !== true && (dailyCount >= dailyLimit || weeklyCount >= weeklyLimit || monthlyCount >= monthlyLimit || yearlyCount >= yearlyLimit);
    if (limitExceeded && profile.requireManagerApprovalOnLimit !== false) {
      approvalStatus = "required";
      const email = input.internalConsumption.managerApprovalEmail.trim().toLowerCase();
      const password = input.internalConsumption.managerApprovalPassword;
      if (!email || !password || input.internalConsumption.managerApprovalReason.trim().length < 3) {
        throw new AppError(`Manager approval is required. Daily ${dailyCount}/${dailyLimit}; weekly ${weeklyCount}/${weeklyLimit}; monthly ${monthlyCount}/${monthlyLimit}; yearly ${yearlyCount}/${yearlyLimit}.`, 409, { code: "INTERNAL_MEAL_APPROVAL_REQUIRED" });
      }
      const manager = await User.findOne({ email, isActive: true, deletedAt: null }).select("+passwordHash name roleId");
      if (!manager || !(await verifyPassword(password, manager.passwordHash))) throw new AppError("Manager approval credentials are invalid.", 403);
      const role = await getRoleWithPermissions(String(manager.roleId));
      const canApprove = role?.permissionIds.some((permission) => ["settings.manage", "orders.update", "pos.manage"].includes(permission.key));
      if (!canApprove) throw new AppError("This account does not have permission to approve meal-limit overrides.", 403);
      approvalStatus = "approved";
      approvalReason = input.internalConsumption.managerApprovalReason.trim();
      approvedBy = manager._id;
      approvedAt = new Date();
    }
  }

  const customer = !isInternalOrder && input.customerId
    ? await User.findOne({ _id: input.customerId, deletedAt: null }).select("name phone email").lean()
    : null;
  if (input.customerId && !customer) throw new AppError("Selected customer is no longer available.", 409);

  const primaryMenuIds = input.items
    .filter((item) => item.sourceType === "menu")
    .map((item) => item.itemId);
  const mixedNaanMenuIds = input.items.flatMap((item) =>
    item.modifiers
      .filter((modifier) => modifier.groupId === MIXED_NAAN_GROUP_ID)
      .map((modifier) => modifier.optionId),
  );
  const menuIds = [...new Set([...primaryMenuIds, ...mixedNaanMenuIds])];
  const posIds = input.items.filter((item) => item.sourceType === "pos").map((item) => item.itemId);
  const menuItemIds = new Set(menuIds);
  const syntheticThinCrustGroupIds = new Set([...menuItemIds].map(thinCrustGroupId));
  const modifierGroupIds = [...new Set(
    input.items.flatMap((item) => item.modifiers.map((modifier) => modifier.groupId))
      .filter((groupId) =>
        !syntheticThinCrustGroupIds.has(groupId) &&
        groupId !== MIXED_NAAN_GROUP_ID,
      ),
  )];

  const [menuItems, posItems, modifierGroups] = await Promise.all([
    MenuItem.find({ _id: { $in: menuIds }, isActive: true, isAvailable: true, deletedAt: null }).lean(),
    POSItem.find({ _id: { $in: posIds }, isActive: true }).lean(),
    ModifierGroup.find({ _id: { $in: modifierGroupIds }, isActive: true }).lean(),
  ]);
  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));
  const posMap = new Map(posItems.map((item) => [String(item._id), item]));
  const groupMap = new Map(modifierGroups.map((group) => [String(group._id), group]));

  const orderLines: ResolvedPosLine[] = input.items.map((line) => {
    if (line.sourceType === "menu") {
      const item = menuMap.get(line.itemId);
      if (!item) throw new AppError("A selected menu item is no longer available.", 409);
      if (input.orderMode === "dine_in" && item.availableForDineIn === false) throw new AppError(`${item.name} is not available for dine-in.`, 409);
      if (input.orderMode === "takeaway" && item.availableForTakeaway === false) throw new AppError(`${item.name} is not available for takeaway.`, 409);

      const variant = line.variantId
        ? item.variants.find((entry) => String(entry._id) === line.variantId && entry.isActive)
        : item.variants.find((entry) => entry.isDefault && entry.isActive) ?? item.variants.find((entry) => entry.isActive);
      if (line.variantId && !variant) throw new AppError(`The selected variant for ${item.name} is unavailable.`, 409);
      const variantName = variant?.name ?? "";
      let baseUnitPrice = money(variant?.price ?? item.basePrice);
      const specialThinCrustGroupId = thinCrustGroupId(line.itemId);
      const specialThinCrustOptionId = thinCrustOptionId(line.itemId);
      const thinCrustSelections = line.modifiers.filter((modifier) => modifier.groupId === specialThinCrustGroupId);
      const mixedNaanSelections = line.modifiers.filter((modifier) => modifier.groupId === MIXED_NAAN_GROUP_ID);
      const regularSelections = line.modifiers.filter(
        (modifier) =>
          modifier.groupId !== specialThinCrustGroupId &&
          modifier.groupId !== MIXED_NAAN_GROUP_ID,
      );

      if (thinCrustSelections.length > 0) {
        const configuration = item.pizzaConfiguration as { thinCrustAvailable?: boolean } | undefined;
        if (
          !isThinCrustEnabled(item.name, configuration) ||
          !isMediumPizzaVariant(variantName) ||
          thinCrustSelections.length !== 1 ||
          thinCrustSelections[0]?.optionId !== specialThinCrustOptionId ||
          thinCrustSelections[0]?.quantity !== 1
        ) {
          throw new AppError("Thin Crust is available only for eligible Medium pizzas.", 422);
        }
      }

      const allowedGroups = new Set(item.modifierGroupIds.map(String));
      const combinationPricing = item.combinationPricing;
      const combinationGroupId = combinationPricing?.enabled
        ? combinationPricing.modifierGroupId?.toString()
        : undefined;
      const combinationSelections = combinationGroupId
        ? regularSelections.filter((selection) => selection.groupId === combinationGroupId)
        : [];
      const standardSelections = combinationGroupId
        ? regularSelections.filter((selection) => selection.groupId !== combinationGroupId)
        : regularSelections;

      const resolvedModifiers = resolveModifiers(standardSelections, allowedGroups, groupMap, variantName);

      if (combinationPricing?.enabled) {
        if (!combinationGroupId || combinationSelections.length !== 1 || combinationSelections[0]?.quantity !== 1) {
          throw new AppError("Select one platter option.", 422);
        }

        const selectedCombination = combinationSelections[0];
        const entry = (combinationPricing.entries ?? []).find(
          (candidate) =>
            (
              candidate.optionId?.toString() === selectedCombination.optionId ||
              normalizeMenuLabel(candidate.optionName ?? "") === normalizeMenuLabel(selectedCombination.optionName ?? "")
            ) &&
            normalizeMenuLabel(candidate.variantLabel) === normalizeMenuLabel(variantName),
        );
        if (!entry) throw new AppError("The selected platter combination has no configured price.", 422);

        const group = groupMap.get(combinationGroupId);
        if (!group) throw new AppError("The configured platter group is no longer available.", 409);
        const currentOption = group.options.find(
          (option) =>
            option.isActive &&
            option.isAvailable &&
            (
              String(option._id) === selectedCombination.optionId ||
              normalizeMenuLabel(option.name) === normalizeMenuLabel(selectedCombination.optionName ?? "") ||
              normalizeMenuLabel(option.name) === normalizeMenuLabel(entry.optionName ?? "")
            ),
        );

        resolvedModifiers.push({
          groupId: group._id,
          groupName: group.name,
          optionId: currentOption?._id ?? new Types.ObjectId(entry.optionId),
          optionName: currentOption?.name ?? entry.optionName,
          unitPrice: money(entry.price),
          quantity: 1,
        });
        baseUnitPrice = 0;
      }

      if (mixedNaanSelections.length > 0) {
        if (!combinationPricing?.enabled || !isFullPortion(variantName)) {
          throw new AppError(
            "A different second naan is available only with a Full Chur Chur Naan platter.",
            422,
          );
        }
        if (mixedNaanSelections.length !== 1 || mixedNaanSelections[0]?.quantity !== 1) {
          throw new AppError("Select only one different second naan.", 422);
        }
        const selectedCombination = combinationSelections[0];
        const currentEntry = (combinationPricing.entries ?? []).find(
          (candidate) =>
            candidate.optionId?.toString() === selectedCombination?.optionId &&
            normalizeMenuLabel(candidate.variantLabel) === normalizeMenuLabel(variantName),
        );
        if (!selectedCombination || !currentEntry) {
          throw new AppError("Select the platter sabji before choosing a second naan.", 422);
        }
        const alternateId = mixedNaanSelections[0].optionId;
        if (alternateId === line.itemId) {
          throw new AppError("Choose a different naan for the second naan.", 422);
        }
        const alternate = menuMap.get(alternateId);
        if (
          !alternate ||
          String(alternate.categoryId) !== String(item.categoryId) ||
          !alternate.combinationPricing?.enabled
        ) {
          throw new AppError("The selected second naan is unavailable.", 409);
        }
        const alternatePrice = findMixedNaanPrice(
          (alternate.combinationPricing.entries ?? []).map((candidate) => ({
            variantLabel: candidate.variantLabel,
            optionId: candidate.optionId?.toString() ?? "",
            optionName: candidate.optionName,
            price: candidate.price,
          })),
          variantName,
          selectedCombination.optionId,
          currentEntry.optionName,
        );
        if (alternatePrice == null) {
          throw new AppError(
            "The selected second naan has no Full price for this platter.",
            422,
          );
        }
        const adjustment = money(
          Math.max(Number(currentEntry.price), alternatePrice) - Number(currentEntry.price),
        );
        resolvedModifiers.push({
          groupId: new Types.ObjectId(MIXED_NAAN_GROUP_ID),
          groupName: MIXED_NAAN_GROUP_NAME,
          optionId: new Types.ObjectId(alternateId),
          optionName: alternate.name,
          unitPrice: adjustment,
          quantity: 1,
        });
      }

      validateRequiredGroups(item.modifierGroupIds.map(String), resolvedModifiers, groupMap);

      if (thinCrustSelections.length === 1) {
        resolvedModifiers.push({
          groupId: new Types.ObjectId(specialThinCrustGroupId),
          groupName: "Crust",
          optionId: new Types.ObjectId(specialThinCrustOptionId),
          optionName: "Thin Crust",
          unitPrice: 0,
          quantity: 1,
        });
      }

      const modifierUnitTotal = resolvedModifiers.reduce((sum, modifier) => sum + modifier.unitPrice * modifier.quantity, 0);
      const lineUnitPrice = money(baseUnitPrice + modifierUnitTotal);

      return {
        sourceType: "menu",
        menuItemId: item._id,
        posItemId: null,
        categoryId: item.categoryId,
        name: item.name,
        imageUrl: item.imageUrl,
        variantId: variant?._id ?? null,
        variantName: variant?.name ?? "",
        baseUnitPrice,
        modifiers: resolvedModifiers,
        quantity: line.quantity,
        specialInstructions: line.specialInstructions,
        lineUnitPrice,
        lineTotal: money(lineUnitPrice * line.quantity),
        sendToKds: true,
        stationId: null,
      };
    }

    const item = posMap.get(line.itemId);
    if (!item) throw new AppError("A selected POS item is no longer available.", 409);
    const customPrice = item.allowCustomPrice && typeof line.unitPrice === "number" ? line.unitPrice : item.sellingPrice;
    const unitPrice = money(customPrice);
    return {
      sourceType: "pos",
      menuItemId: null,
      posItemId: item._id,
      categoryId: null,
      name: item.name,
      imageUrl: item.imageUrl,
      variantId: null,
      variantName: "",
      baseUnitPrice: unitPrice,
      modifiers: [],
      quantity: line.quantity,
      specialInstructions: line.specialInstructions,
      lineUnitPrice: unitPrice,
      lineTotal: money(unitPrice * line.quantity),
      sendToKds: item.sendToKds,
      stationId: item.kitchenStationId ?? null,
    };
  });

  const subtotal = money(orderLines.reduce((sum, item) => sum + item.lineTotal, 0));
  const adjustments = isInternalOrder ? normalizeAdjustments({ discountType: "none", discountValue: 0, discountReason: "", packingCharge: 0, serviceCharge: 0, additionalCharge: 0, additionalChargeLabel: "Additional charge", taxRate: 0, taxMode: "exclusive" }, subtotal) : normalizeAdjustments(input.adjustments, subtotal);
  const discountTotal = adjustments.discountType === "percentage"
    ? wholeRupee(Math.min(subtotal, subtotal * adjustments.discountValue / 100))
    : adjustments.discountType === "fixed" ? wholeRupee(Math.min(subtotal, adjustments.discountValue)) : 0;
  const netSubtotal = wholeRupee(subtotal - discountTotal);
  const chargesTotal = wholeRupee(adjustments.packingCharge + adjustments.serviceCharge + adjustments.additionalCharge);
  const preTax = wholeRupee(netSubtotal + chargesTotal);
  const taxTotal = adjustments.taxRate <= 0 ? 0 : adjustments.taxMode === "inclusive"
    ? wholeRupee(preTax - preTax / (1 + adjustments.taxRate / 100))
    : wholeRupee(preTax * adjustments.taxRate / 100);
  const calculatedGrandTotal = wholeRupee(adjustments.taxMode === "inclusive" ? preTax : preTax + taxTotal);
  const grandTotal = isInternalOrder ? 0 : calculatedGrandTotal;

  const waivedAmount = isInternalOrder ? 0 : wholeRupee(Math.min(input.waivedAmount, grandTotal));
  const saleAmountDue = wholeRupee(grandTotal - waivedAmount);
  const tipAmount = isInternalOrder ? 0 : wholeRupee(input.tipAmount);
  // A tip only enters restaurant collections when the restaurant currently holds it.
  // This covers UPI tips and cash tips received at the counter for later waiter payout.
  const restaurantHeldTip = input.tipCollection === "restaurant" ? tipAmount : 0;
  const collectionTarget = wholeRupee(saleAmountDue + restaurantHeldTip);
  const paymentBreakdown = isInternalOrder ? [] : input.paymentMethod === "split"
    ? input.paymentBreakdown.filter((part) => part.amount > 0).map((part) => ({ method: part.method, amount: money(part.amount), reference: part.reference.trim() }))
    : [{ method: input.paymentMethod, amount: input.paymentMethod === "cash" ? money(input.amountTendered) : collectionTarget, reference: input.paymentMethod === "upi" ? input.upiReference.trim() : "" }];
  const collected = money(paymentBreakdown.reduce((sum, part) => sum + part.amount, 0));
  if (!isInternalOrder && collected < collectionTarget) throw new AppError("Collected payment is less than the restaurant amount due.", 422);
  if (!isInternalOrder && input.paymentMethod === "split" && Math.abs(collected - collectionTarget) > 0.01) throw new AppError("Split payment amounts must exactly equal the restaurant amount due, including any UPI tip.", 422);
  const cashPaid = money(paymentBreakdown.filter((part) => part.method === "cash").reduce((sum, part) => sum + part.amount, 0));
  const amountTendered = cashPaid;
  const changeDue = input.paymentMethod === "cash" ? money(Math.max(0, collected - collectionTarget)) : 0;

  await assertInventoryAvailable(orderLines);

  const now = new Date();
  const orderNumber = await nextOrderNumber();
  const order = await Order.create({
    orderNumber,
    customerId: customer?._id ?? null,
    saleType: input.internalConsumption.saleType,
    isRevenueOrder: !isInternalOrder,
    internalConsumption: {
      referenceId: input.internalConsumption.referenceId ? new Types.ObjectId(input.internalConsumption.referenceId) : null,
      personName: input.internalConsumption.personName.trim(),
      reason: input.internalConsumption.reason.trim(),
      notes: input.internalConsumption.notes.trim(),
      menuValue: subtotal,
      approvalStatus,
      approvalReason,
      approvedBy: approvedBy ?? (isInternalOrder ? new Types.ObjectId(actorId) : null),
      approvedAt: approvedAt ?? (isInternalOrder ? now : null),
      dailyUsageBefore,
      monthlyUsageBefore,
      dailyLimit,
      monthlyLimit,
    },
    orderSource: "pos",
    posShiftId: shift._id,
    posRegisterId: shift.registerId,
    cashierId: new Types.ObjectId(actorId),
    upiReference: !isInternalOrder && input.paymentMethod === "upi" ? input.upiReference : "",
    paymentBreakdown,
    waivedAmount,
    waivedReason: waivedAmount > 0 ? input.waivedReason.trim() : "",
    tipAmount,
    tipMethod: tipAmount > 0 ? input.tipMethod : "none",
    tipCollection: tipAmount > 0 ? input.tipCollection : "none",
    orderTakerName: input.orderTakerName.trim(),
    paymentConfirmedBy: new Types.ObjectId(actorId),
    paymentConfirmedAt: now,
    amountTendered,
    changeDue,
    customerSnapshot: {
      name: isInternalOrder ? input.internalConsumption.personName.trim() : customer?.name ?? (input.customerName || "Walk-in Customer"),
      phone: customer?.phone ?? input.customerPhone,
      email: customer?.email ?? input.customerEmail,
    },
    items: orderLines.map((item) => ({
      sourceType: item.sourceType,
      menuItemId: item.menuItemId,
      posItemId: item.posItemId,
      name: item.name,
      imageUrl: item.imageUrl,
      variantId: item.variantId,
      variantName: item.variantName,
      baseUnitPrice: item.baseUnitPrice,
      modifiers: item.modifiers.flatMap((modifier) => Array.from({ length: modifier.quantity }, () => ({
        groupId: modifier.groupId,
        groupName: modifier.groupName,
        optionId: modifier.optionId,
        optionName: modifier.optionName,
        unitPrice: modifier.unitPrice,
      }))),
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      lineUnitPrice: item.lineUnitPrice,
      lineTotal: item.lineTotal,
    })),
    orderMode: input.orderMode,
    tableNumber: input.orderMode === "dine_in" ? input.tableNumber : "",
    customerNote: input.customerNote,
    status: "preparing",
    statusHistory: [
      {
        status: "placed",
        note: isInternalOrder ? "Internal consumption order created from POS." : "Order created and paid from POS.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
      {
        status: "accepted",
        note: "POS orders are accepted automatically.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
      {
        status: "preparing",
        note: "POS order sent directly to kitchen preparation.",
        changedBy: new Types.ObjectId(actorId),
        changedAt: now,
      },
    ],
    acceptedAt: now,
    preparingAt: now,
    paymentStatus: "paid",
    paymentMethod: isInternalOrder ? "cash" : input.paymentMethod,
    subtotal,
    taxTotal: isInternalOrder ? 0 : taxTotal,
    discountTotal: isInternalOrder ? subtotal : discountTotal,
    packingCharge: adjustments.packingCharge,
    serviceCharge: adjustments.serviceCharge,
    additionalCharge: adjustments.additionalCharge,
    additionalChargeLabel: adjustments.additionalChargeLabel,
    taxRate: adjustments.taxRate,
    taxMode: adjustments.taxMode,
    discountType: isInternalOrder ? "fixed" : adjustments.discountType,
    discountValue: isInternalOrder ? subtotal : adjustments.discountValue,
    discountReason: isInternalOrder ? `Internal consumption: ${input.internalConsumption.reason.trim()}` : adjustments.discountReason,
    grandTotal,
    loyaltyEligibleAmount: 0,
    itemCount: orderLines.reduce((sum, item) => sum + item.quantity, 0),
    createdBy: new Types.ObjectId(actorId),
    updatedBy: new Types.ObjectId(actorId),
  });

  if (isInternalOrder) {
    await InternalConsumptionAudit.create({
      orderId: order._id,
      action: approvalStatus === "approved" ? "approved" : "created",
      saleType: input.internalConsumption.saleType,
      subjectId: input.internalConsumption.referenceId ? new Types.ObjectId(input.internalConsumption.referenceId) : null,
      subjectName: input.internalConsumption.personName.trim(),
      actorId: new Types.ObjectId(actorId),
      approvedBy,
      reason: approvalReason || input.internalConsumption.reason.trim(),
      metadata: { dailyUsageBefore, monthlyUsageBefore, dailyLimit, monthlyLimit, menuValue: subtotal },
    });
  }

  try {
    if (!isInternalOrder && cashPaid > 0) {
      await POSCashMovement.create({
        shiftId: shift._id,
        type: "cash_sale",
        amount: cashPaid,
        reason: `Cash sale ${orderNumber}`,
        referenceType: "order",
        referenceId: order._id,
        createdBy: new Types.ObjectId(actorId),
      });
      await POSShift.updateOne({ _id: shift._id }, { $inc: { expectedCash: cashPaid } });
    }

    await deductInventory(orderLines, order._id, actorId);
    await createKitchenOutput(order, orderLines, actorId);
    const invoice = await getOrCreateInvoice(String(order._id), actorId);

    publishOrderCreated({
      orderId: String(order._id), orderNumber, customerId: order.customerId?.toString(), status: order.status,
      paymentStatus: order.paymentStatus, grandTotal, orderMode: order.orderMode, actorId,
    });
    publishRealtimeEventSafely({
      event: "pos.order_created",
      entityId: String(order._id),
      actorId,
      data: { orderId: String(order._id), orderNumber, grandTotal, paymentMethod: isInternalOrder ? "not_required" : input.paymentMethod, saleType: input.internalConsumption.saleType },
      target: { roleKeys: ["super_admin", "admin", "manager", "cashier", "kitchen"] },
    });
    publishDashboardRefresh("pos.order_created", actorId);

    return { order, invoice };
  } catch (error) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: "cancelled", cancelledAt: new Date(), cancellationReason: "POS finalization failed after order creation." } },
    );
    throw error;
  }
}

function normalizeAdjustments(input: AdjustmentsInput, subtotal: number): AdjustmentsInput {
  const discountType = input.discountType;
  const discountValue = discountType === "percentage"
    ? Math.min(100, money(input.discountValue))
    : Math.min(subtotal, money(input.discountValue));
  if (discountType !== "none" && !input.discountReason.trim()) throw new AppError("Discount reason is required.", 422);
  return {
    discountType,
    discountValue,
    discountReason: input.discountReason.trim(),
    packingCharge: money(input.packingCharge),
    serviceCharge: money(input.serviceCharge),
    additionalCharge: money(input.additionalCharge),
    additionalChargeLabel: input.additionalChargeLabel.trim() || "Additional charge",
    taxRate: Math.min(100, money(input.taxRate)),
    taxMode: input.taxMode,
  };
}

function normalizeMenuLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveModifiers(
  selections: ModifierInput[],
  allowedGroups: Set<string>,
  groupMap: Map<string, ModifierGroupRecord>,
  variantName: string,
): ResolvedModifier[] {
  const grouped = new Map<string, ModifierInput[]>();
  for (const selection of selections) {
    if (!allowedGroups.has(selection.groupId)) throw new AppError("A selected modifier group is not allowed for this item.", 409);
    const values = grouped.get(selection.groupId) ?? [];
    values.push(selection);
    grouped.set(selection.groupId, values);
  }

  const resolved: ResolvedModifier[] = [];
  for (const [groupId, groupSelections] of grouped) {
    const group = groupMap.get(groupId);
    if (!group) throw new AppError("A selected modifier group is no longer available.", 409);
    const selectionCount = groupSelections.reduce((sum, selection) => sum + selection.quantity, 0);
    if (selectionCount < Number(group.minSelections ?? 0) || selectionCount > Number(group.maxSelections ?? 1)) {
      throw new AppError(`Invalid number of selections for ${group.name}.`, 422);
    }
    if (group.selectionType === "single" && selectionCount !== 1) throw new AppError(`${group.name} requires one selection.`, 422);

    for (const selection of groupSelections) {
      const option = group.options.find((entry: ModifierOptionRecord) =>
        String(entry._id) === selection.optionId && entry.isActive && entry.isAvailable,
      ) ?? (selection.optionName
        ? group.options.find((entry: ModifierOptionRecord) =>
            normalizeMenuLabel(entry.name) === normalizeMenuLabel(selection.optionName ?? "") &&
            entry.isActive && entry.isAvailable,
          )
        : undefined);
      if (!option) throw new AppError(`The selected ${group.name} option is no longer available. Reconfigure this item and try again.`, 409);
      if (selection.quantity > Number(option.maxQuantity ?? 1)) throw new AppError(`Selected quantity for ${option.name} is too high.`, 422);
      const modifierPrice = resolveVariantModifierPrice(
        Number(option.price ?? 0),
        option.variantPrices,
        variantName,
      );
      resolved.push({
        groupId: group._id,
        groupName: group.name,
        optionId: option._id,
        optionName: option.name,
        unitPrice: money(modifierPrice),
        quantity: selection.quantity,
      });
    }
  }
  return resolved;
}

function validateRequiredGroups(
  groupIds: string[],
  resolved: ResolvedModifier[],
  groupMap: Map<string, ModifierGroupRecord>,
) {
  const countByGroup = new Map<string, number>();
  for (const modifier of resolved) countByGroup.set(String(modifier.groupId), (countByGroup.get(String(modifier.groupId)) ?? 0) + modifier.quantity);
  for (const groupId of groupIds) {
    const group = groupMap.get(groupId);
    if (!group || !group.isRequired) continue;
    if ((countByGroup.get(groupId) ?? 0) < Math.max(1, Number(group.minSelections ?? 1))) {
      throw new AppError(`${group.name} requires a selection.`, 422);
    }
  }
}

async function assertInventoryAvailable(lines: ResolvedPosLine[]) {
  const requirements = await inventoryRequirements(lines);
  if (!requirements.size) return;
  const stocks = await InventoryItem.find({ _id: { $in: [...requirements.keys()].map((id) => new Types.ObjectId(id)) } })
    .select("name currentStock")
    .lean();
  const stockMap = new Map(stocks.map((item) => [String(item._id), item]));
  for (const [id, quantity] of requirements) {
    const stock = stockMap.get(id);
    if (!stock || stock.currentStock < quantity) throw new AppError(`Insufficient inventory for ${stock?.name ?? "an ingredient"}.`, 409);
  }
}

async function inventoryRequirements(lines: ResolvedPosLine[]) {
  const menuIds = lines.filter((line) => line.menuItemId).map((line) => line.menuItemId);
  const posIds = lines.filter((line) => line.posItemId).map((line) => line.posItemId);
  const [menuRecipes, posRecipes] = await Promise.all([
    MenuItemRecipe.find({ menuItemId: { $in: menuIds }, isActive: true }).lean(),
    POSItemRecipe.find({ posItemId: { $in: posIds }, isActive: true }).lean(),
  ]);
  const menuRecipeMap = new Map(menuRecipes.map((recipe) => [String(recipe.menuItemId), recipe]));
  const posRecipeMap = new Map(posRecipes.map((recipe) => [String(recipe.posItemId), recipe]));
  const requirements = new Map<string, number>();
  for (const line of lines) {
    const recipe = line.sourceType === "menu" ? menuRecipeMap.get(String(line.menuItemId)) : posRecipeMap.get(String(line.posItemId));
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const quantity = Number(ingredient.quantity) * line.quantity / Number(recipe.yieldQuantity || 1);
      const key = String(ingredient.inventoryItemId);
      requirements.set(key, (requirements.get(key) ?? 0) + quantity);
    }
  }
  return requirements;
}

async function deductInventory(lines: ResolvedPosLine[], orderId: Types.ObjectId, actorId: string) {
  const requirements = await inventoryRequirements(lines);
  for (const [inventoryItemId, quantity] of requirements) {
    const stockItem = await InventoryItem.findOneAndUpdate(
      { _id: inventoryItemId, currentStock: { $gte: quantity } },
      { $inc: { currentStock: -quantity } },
      { returnDocument: "before" },
    );
    if (!stockItem) throw new AppError("Inventory changed while the sale was being completed. Please retry.", 409);
    await InventoryMovement.create({
      inventoryItemId: stockItem._id,
      type: "sale",
      quantity,
      stockBefore: stockItem.currentStock,
      stockAfter: stockItem.currentStock - quantity,
      unitCost: stockItem.averageUnitCost,
      totalCost: money(stockItem.averageUnitCost * quantity),
      referenceType: "order",
      referenceId: orderId,
      reason: "POS sale inventory deduction",
      performedBy: new Types.ObjectId(actorId),
    });
  }
}

async function createKitchenOutput(
  order: KitchenOrderRecord,
  lines: ResolvedPosLine[],
  actorId: string,
) {
  if (lines.length === 0) return;

  await createKitchenTicketsFromOrder({
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    source: "pos",
    actorId,
    fulfilmentType: order.orderMode === "dine_in" ? "dine_in" : "pickup",
    tableLabel: order.tableNumber,
    customerName: order.customerSnapshot?.name ?? "Walk-in Customer",
    customerPhone: order.customerSnapshot?.phone ?? "",
    customerEmail: order.customerSnapshot?.email ?? "",
    orderTakerName: (order as KitchenOrderRecord & { orderTakerName?: string }).orderTakerName ?? "",
    items: lines.map((line) => {
      const orderItem = order.items.find((item) =>
        line.sourceType === "menu"
          ? String(item.menuItemId) === String(line.menuItemId) &&
            String(item.variantId ?? "") === String(line.variantId ?? "")
          : String(item.posItemId) === String(line.posItemId),
      );

      if (!orderItem?._id) {
        throw new AppError("Unable to map a kitchen item to the order.", 500);
      }

      const kitchenItemId =
        line.sourceType === "menu" ? line.menuItemId : line.posItemId;

      if (!kitchenItemId) {
        throw new AppError("Kitchen item identifier is missing.", 500);
      }

      return {
        orderItemId: String(orderItem._id),
        menuItemId: String(kitchenItemId),
        categoryId:
          line.sourceType === "menu" && line.categoryId
            ? String(line.categoryId)
            : null,
        name: line.name,
        variantName: line.variantName ?? "",
        quantity: line.quantity,
        notes: line.specialInstructions,
        modifiers: line.modifiers.map((modifier) => ({
          name: modifier.groupName,
          value: `${modifier.optionName}${
            modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""
          }`,
        })),
      };
    }),
  });

  publishKdsQueueUpdated("pos.order_created");
}

export async function markInvoicePrinted(invoiceId: string, actorId: string) {
  let invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    {
      $inc: { printCount: 1 },
      $set: {
        lastPrintedAt: new Date(),
        lastPrintedBy: new Types.ObjectId(actorId),
      },
    },
    { returnDocument: "after" },
  );

  if (!invoice) {
    throw new AppError("Bill not found.", 404);
  }

  if (
    invoice.paymentMethod === "split" &&
    (!invoice.paymentBreakdown || invoice.paymentBreakdown.length === 0)
  ) {
    const order = await Order.findById(invoice.orderId)
      .select({ paymentBreakdown: 1 })
      .lean();

    const paymentBreakdown = (order?.paymentBreakdown ?? [])
      .filter((part) => Number(part.amount) > 0)
      .map((part) => ({
        method: part.method,
        amount: part.amount,
      }));

    if (paymentBreakdown.length > 0) {
      invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        { $set: { paymentBreakdown } },
        { returnDocument: "after" },
      ) ?? invoice;
    }
  }

  return invoice;
}
