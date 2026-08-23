import { AppError } from "@/lib/errors/AppError";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { Coupon } from "@/models/Coupon";
import { CouponRedemption } from "@/models/CouponRedemption";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { getSetting } from "@/services/settings.service";
import { recalculateCart } from "@/services/cart.service";
import {
  getOrCreateWallet,
  redeemCoins,
  validateCoupon,
} from "@/services/rewards.service";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


export async function createOrderFromCart(input: {
  customerId: string;
  orderMode: "dine_in" | "takeaway";
  tableNumber: string;
  requestedPickupAt?: string | null;
  customerNote: string;
  paymentMethod: "online";
  couponCode?: string;
  coinsToRedeem: number;
}) {
  const cart = await recalculateCart(input.customerId);
  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty.", 400);
  }

  const customer = await User.findById(input.customerId).lean();
  if (!customer) throw new AppError("Customer account not found.", 404);

  const setting = await getSetting("ordering");
  const ordering = setting.data as Record<string, unknown>;
  const storeStatus = String(ordering.storeStatus ?? "open");

  if (
    ordering.orderingEnabled === false ||
    ordering.acceptingOrders === false ||
    storeStatus === "closed" ||
    storeStatus === "not_accepting_orders"
  ) {
    throw new AppError(
      String(ordering.statusMessage ?? "TRS is not accepting orders right now."),
      409,
    );
  }

  if (input.orderMode === "dine_in" && ordering.dineInEnabled === false) {
    throw new AppError("Dine-in ordering is currently unavailable.", 409);
  }

  if (input.orderMode === "takeaway" && ordering.pickupEnabled === false) {
    throw new AppError("Takeaway ordering is currently unavailable.", 409);
  }

  const itemQuantity = cart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const maximumItems = Number(ordering.maxItemsPerOrder ?? 50);
  if (itemQuantity > maximumItems) {
    throw new AppError(`An order may contain at most ${maximumItems} items.`, 400);
  }

  const minimumOrderAmount = Number(ordering.minimumOrderAmount ?? 0);
  const maximumOrderAmount = Number(ordering.maximumOrderAmount ?? 50000);
  if (cart.subtotal < minimumOrderAmount) {
    throw new AppError(`Minimum order amount is ₹${minimumOrderAmount}.`, 400);
  }
  if (cart.subtotal > maximumOrderAmount) {
    throw new AppError(`Maximum order amount is ₹${maximumOrderAmount}.`, 400);
  }

  const requestedPickupAt = input.requestedPickupAt
    ? new Date(input.requestedPickupAt)
    : null;
  const currentTime = new Date();

  if (!requestedPickupAt || Number.isNaN(requestedPickupAt.getTime())) {
    throw new AppError("Select a valid same-day order time.", 400);
  }

  if (
    requestedPickupAt.getFullYear() !== currentTime.getFullYear() ||
    requestedPickupAt.getMonth() !== currentTime.getMonth() ||
    requestedPickupAt.getDate() !== currentTime.getDate()
  ) {
    throw new AppError("Only same-day orders are accepted.", 400);
  }

  const clockDate = (clock: unknown) => {
    const [hours, minutes] = String(clock ?? "00:00").split(":").map(Number);
    const value = new Date(currentTime);
    value.setHours(hours, minutes, 0, 0);
    return value;
  };

  const opening = clockDate(ordering.openingTime ?? "17:30");
  const closing = clockDate(ordering.closingTime ?? "23:00");
  const minimumReadyAt = new Date(
    currentTime.getTime() +
      (Number(ordering.preparationTimeMinutes ?? 15) +
        Number(ordering.pickupBufferMinutes ?? 0)) *
        60_000,
  );

  if (
    requestedPickupAt < opening ||
    requestedPickupAt > closing ||
    requestedPickupAt < minimumReadyAt
  ) {
    throw new AppError(
      "Choose a future time within today's working hours.",
      400,
    );
  }

  const containsNonStackableDiscount = cart.items.some(
    (item) => item.isCombo === true || item.isDiscountedItem === true,
  );
  if (containsNonStackableDiscount && (input.couponCode || input.coinsToRedeem > 0)) {
    throw new AppError(
      "Coupons and TRS Coin redemption are not available when the cart contains a combo or discounted menu item.",
      400,
    );
  }

  let couponId = null;
  let couponCode = "";
  let couponDiscount = 0;

  if (input.couponCode) {
    const couponResult = await validateCoupon({
      code: input.couponCode,
      customerId: input.customerId,
      subtotal: cart.subtotal,
      orderMode: input.orderMode,
      items: cart.items.map((item) => ({
        menuItemId: String(item.menuItemId),
        lineTotal: item.lineTotal,
        lineUnitPrice: item.lineUnitPrice,
        quantity: item.quantity,
      })),
    });
    couponId = couponResult.coupon._id;
    couponCode = couponResult.coupon.code;
    couponDiscount = couponResult.discountAmount;
  }

  const payableAfterCoupon = roundMoney(
    Math.max(0, cart.subtotal + cart.taxTotal - couponDiscount),
  );

  let coinsRedeemed = input.coinsToRedeem;
  if (coinsRedeemed > 0) {
    const wallet = await getOrCreateWallet(input.customerId);
    if (wallet.balance < coinsRedeemed) {
      throw new AppError("Insufficient TRS Coins.", 400);
    }
    coinsRedeemed = Math.min(coinsRedeemed, Math.floor(payableAfterCoupon));
  }

  const coinDiscount = roundMoney(coinsRedeemed);
  const discountTotal = roundMoney(couponDiscount + coinDiscount);
  const grandTotal = roundMoney(
    Math.max(0, cart.subtotal + cart.taxTotal - discountTotal),
  );
  const loyaltyEligibleAmount = roundMoney(
    Math.max(0, cart.subtotal - couponDiscount),
  );

  const orderNumber = await nextOrderNumber();
  const now = new Date();

  const order = await Order.create({
    orderNumber,
    customerId: customer._id,
    customerSnapshot: {
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email,
    },
    items: cart.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      imageUrl: item.imageUrl,
      variantId: item.variantId,
      variantName: item.variantName,
      baseUnitPrice: item.baseUnitPrice,
      isDiscountedItem: item.isDiscountedItem ?? false,
      originalUnitPrice: item.originalUnitPrice ?? null,
      itemDiscountSavings: item.itemDiscountSavings ?? null,
      isCombo: item.isCombo ?? false,
      comboId: item.comboId ?? null,
      comboOriginalPrice: item.comboOriginalPrice ?? null,
      comboSellingPrice: item.comboSellingPrice ?? null,
      comboSavings: item.comboSavings ?? null,
      comboItems: item.comboItems ?? [],
      modifiers: item.modifiers,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      lineUnitPrice: item.lineUnitPrice,
      lineTotal: item.lineTotal,
    })),
    orderMode: input.orderMode,
    tableNumber: input.orderMode === "dine_in" ? input.tableNumber : "",
    requestedPickupAt,
    estimatedReadyAt: requestedPickupAt,
    customerNote: input.customerNote,
    status: "placed",
    statusHistory: [
      {
        status: "placed",
        note: "Order placed by customer.",
        changedBy: customer._id,
        changedAt: now,
      },
    ],
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    couponId,
    couponCode,
    couponDiscount,
    coinsRedeemed,
    coinDiscount,
    subtotal: cart.subtotal,
    taxTotal: cart.taxTotal,
    discountTotal,
    grandTotal,
    loyaltyEligibleAmount,
    itemCount: cart.itemCount,
    createdBy: customer._id,
    updatedBy: customer._id,
  });

  try {
    if (couponId && couponCode) {
      await CouponRedemption.create({
        couponId,
        customerId: customer._id,
        orderId: order._id,
        codeSnapshot: couponCode,
        discountAmount: couponDiscount,
        redeemedAt: now,
      });
      await Coupon.updateOne(
        { _id: couponId },
        { $inc: { usedCount: 1 } },
      );
    }

    if (coinsRedeemed > 0) {
      await redeemCoins({
        customerId: input.customerId,
        coins: coinsRedeemed,
        orderId: order.id,
        actorId: input.customerId,
      });
    }
  } catch (error) {
    await Order.deleteOne({ _id: order._id });
    if (couponId) {
      await CouponRedemption.deleteOne({ orderId: order._id });
      await Coupon.updateOne(
        { _id: couponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
      );
    }
    throw error;
  }

  cart.items.splice(0, cart.items.length);
  cart.subtotal = 0;
  cart.taxTotal = 0;
  cart.discountTotal = 0;
  cart.grandTotal = 0;
  cart.itemCount = 0;
  await cart.save();

  // Online orders are published only after Razorpay capture is verified.

  return order;
}
