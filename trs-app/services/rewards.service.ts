import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { CoinTransaction } from "@/models/CoinTransaction";
import { CoinWallet } from "@/models/CoinWallet";
import { Coupon } from "@/models/Coupon";
import { CouponRedemption } from "@/models/CouponRedemption";
import { Order } from "@/models/Order";
import { MenuItem } from "@/models/MenuItem";
import { LoyaltyMembership } from "@/models/LoyaltyMembership";
import { LoyaltyPointLot } from "@/models/LoyaltyPointLot";
import { LoyaltyTier } from "@/models/LoyaltyTier";

const COIN_VALUE_INR = 1;
const EARN_RATE_PER_100_INR = 5;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getOrCreateWallet(customerId: string) {
  let wallet = await CoinWallet.findOne({ customerId });
  if (!wallet) wallet = await CoinWallet.create({ customerId });
  return wallet;
}

export async function validateCoupon(input: {
  code: string;
  customerId: string;
  subtotal: number;
  orderMode: "dine_in" | "takeaway";
  items?: Array<{ menuItemId: string; lineTotal: number; lineUnitPrice: number; quantity: number }>;
}) {
  const now = new Date();

  const coupon = await Coupon.findOne({
    code: input.code.toUpperCase(),
    isActive: true,
    deletedAt: null,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  }).lean();

  if (!coupon) throw new AppError("Coupon is invalid or expired.", 400);

  if (!coupon.applicableOrderModes.includes(input.orderMode)) {
    throw new AppError("Coupon is not valid for this order type.", 400);
  }

  if (input.subtotal < coupon.minimumOrderAmount) {
    throw new AppError(
      `Minimum order amount is ₹${coupon.minimumOrderAmount}.`,
      400,
    );
  }

  let eligibleSubtotal = input.subtotal;
  if (input.items?.length) {
    const itemIds = input.items.map((item) => item.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } })
      .select("_id categoryId")
      .lean();
    const categoryByItem = new Map(menuItems.map((item) => [String(item._id), String(item.categoryId)]));
    const includedItems = new Set(coupon.applicableMenuItemIds.map(String));
    const includedCategories = new Set(coupon.applicableCategoryIds.map(String));
    const excludedItems = new Set(coupon.excludedMenuItemIds.map(String));
    const hasInclusionRules = includedItems.size > 0 || includedCategories.size > 0;

    eligibleSubtotal = roundMoney(input.items.reduce((sum, item) => {
      const itemId = String(item.menuItemId);
      if (excludedItems.has(itemId)) return sum;
      const categoryId = categoryByItem.get(itemId);
      const included = !hasInclusionRules || includedItems.has(itemId) || Boolean(categoryId && includedCategories.has(categoryId));
      return included ? sum + item.lineTotal : sum;
    }, 0));

    if (eligibleSubtotal <= 0) {
      throw new AppError("This coupon does not apply to the items in your cart.", 400);
    }
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("Coupon usage limit has been reached.", 400);
  }

  const customerUsage = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    customerId: input.customerId,
  });

  if (customerUsage >= coupon.usageLimitPerCustomer) {
    throw new AppError("You have already used this coupon.", 400);
  }

  if (coupon.firstOrderOnly) {
    const previousOrders = await Order.countDocuments({
      customerId: input.customerId,
      status: { $nin: ["cancelled", "rejected"] },
    });
    if (previousOrders > 0) {
      throw new AppError("This coupon is valid only on the first order.", 400);
    }
  }

  let discountAmount: number;
  let freeItem: { menuItemId: string; name: string; discountAmount: number } | null = null;

  if (coupon.discountType === "free_item") {
    const freeMenuItemId = coupon.freeMenuItemId ? String(coupon.freeMenuItemId) : "";
    const matchingCartItem = input.items?.find(
      (item) => String(item.menuItemId) === freeMenuItemId && item.quantity > 0,
    );

    if (!freeMenuItemId || !matchingCartItem) {
      throw new AppError(
        "Add the eligible free item to your cart before applying this coupon.",
        400,
      );
    }

    const menuItem = await MenuItem.findOne({
      _id: freeMenuItemId,
      isActive: true,
      isAvailable: true,
      deletedAt: null,
    })
      .select("name")
      .lean();

    if (!menuItem) {
      throw new AppError("The free item for this coupon is currently unavailable.", 400);
    }

    discountAmount = matchingCartItem.lineUnitPrice;
    freeItem = {
      menuItemId: freeMenuItemId,
      name: menuItem.name,
      discountAmount: roundMoney(discountAmount),
    };
  } else {
    discountAmount =
      coupon.discountType === "percentage"
        ? eligibleSubtotal * (coupon.discountValue / 100)
        : coupon.discountValue;
  }

  const maxDiscountAmount = coupon.maxDiscountAmount;
  if (coupon.discountType !== "free_item" && typeof maxDiscountAmount === "number") {
    discountAmount = Math.min(discountAmount, maxDiscountAmount);
  }

  discountAmount = roundMoney(Math.min(discountAmount, eligibleSubtotal));

  return {
    coupon,
    discountAmount,
    freeItem,
  };
}

export async function earnCoinsForOrder(input: {
  customerId: string;
  orderId: string;
  eligibleAmount: number;
  actorId?: string | null;
}) {
  const existing = await CoinTransaction.findOne({
    orderId: input.orderId,
    type: "earn",
  }).lean();
  if (existing) return existing;

  const membership = await LoyaltyMembership.findOne({ customerId: input.customerId }).lean();
  const tier = membership
    ? await LoyaltyTier.findOne({ key: membership.tierKey, isActive: true }).lean()
    : null;
  const multiplier = tier?.pointsMultiplier ?? 1;
  const coins = Math.floor(
    (input.eligibleAmount / 100) * EARN_RATE_PER_100_INR * multiplier,
  );
  if (coins <= 0) return null;

  const wallet = await getOrCreateWallet(input.customerId);
  wallet.balance += coins;
  wallet.lifetimeEarned += coins;
  wallet.lastActivityAt = new Date();
  await wallet.save();

  const transaction = await CoinTransaction.create({
    customerId: new Types.ObjectId(input.customerId),
    walletId: wallet._id,
    orderId: new Types.ObjectId(input.orderId),
    type: "earn",
    amount: coins,
    balanceAfter: wallet.balance,
    description: `Earned ${coins} TRS Coins from order.`,
    createdBy: input.actorId ? new Types.ObjectId(input.actorId) : null,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  await LoyaltyPointLot.create({
    customerId: new Types.ObjectId(input.customerId),
    transactionId: transaction._id,
    originalAmount: coins,
    remainingAmount: coins,
    expiresAt:
      transaction.expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  return transaction;
}

export async function redeemCoins(input: {
  customerId: string;
  coins: number;
  orderId?: string | null;
  actorId?: string | null;
}) {
  const wallet = await getOrCreateWallet(input.customerId);
  if (wallet.balance < input.coins) {
    throw new AppError("Insufficient TRS Coins.", 400);
  }

  wallet.balance -= input.coins;
  wallet.lifetimeRedeemed += input.coins;
  wallet.lastActivityAt = new Date();
  await wallet.save();

  let remainingToConsume = input.coins;
  const lots = await LoyaltyPointLot.find({
    customerId: input.customerId,
    status: "active",
    remainingAmount: { $gt: 0 },
  }).sort({ expiresAt: 1, createdAt: 1 });
  for (const lot of lots) {
    if (remainingToConsume <= 0) break;
    const used = Math.min(lot.remainingAmount, remainingToConsume);
    lot.remainingAmount -= used;
    remainingToConsume -= used;
    if (lot.remainingAmount === 0) lot.status = "consumed";
    await lot.save();
  }

  const transaction = await CoinTransaction.create({
    customerId: new Types.ObjectId(input.customerId),
    walletId: wallet._id,
    orderId: input.orderId ? new Types.ObjectId(input.orderId) : null,
    type: "redeem",
    amount: -input.coins,
    balanceAfter: wallet.balance,
    description: `Redeemed ${input.coins} TRS Coins.`,
    createdBy: input.actorId ? new Types.ObjectId(input.actorId) : null,
  });

  return {
    transaction,
    discountAmount: roundMoney(input.coins * COIN_VALUE_INR),
    wallet,
  };
}

export async function refundRedeemedCoins(input: {
  customerId: string;
  orderId: string;
  coins: number;
  actorId?: string | null;
}) {
  if (input.coins <= 0) return null;

  const existing = await CoinTransaction.findOne({
    orderId: input.orderId,
    type: "refund",
  }).lean();
  if (existing) return existing;

  const wallet = await getOrCreateWallet(input.customerId);
  wallet.balance += input.coins;
  wallet.lifetimeRedeemed = Math.max(
    0,
    wallet.lifetimeRedeemed - input.coins,
  );
  wallet.lastActivityAt = new Date();
  await wallet.save();

  return CoinTransaction.create({
    customerId: new Types.ObjectId(input.customerId),
    walletId: wallet._id,
    orderId: new Types.ObjectId(input.orderId),
    type: "refund",
    amount: input.coins,
    balanceAfter: wallet.balance,
    description: `Refunded ${input.coins} TRS Coins after order cancellation.`,
    createdBy: input.actorId ? new Types.ObjectId(input.actorId) : null,
  });
}

export async function adjustCoins(input: {
  customerId: string;
  amount: number;
  description: string;
  actorId: string;
}) {
  const wallet = await getOrCreateWallet(input.customerId);
  const nextBalance = wallet.balance + input.amount;
  if (nextBalance < 0) {
    throw new AppError("Adjustment would make the balance negative.", 400);
  }

  wallet.balance = nextBalance;
  if (input.amount > 0) wallet.lifetimeEarned += input.amount;
  else wallet.lifetimeRedeemed += Math.abs(input.amount);
  wallet.lastActivityAt = new Date();
  await wallet.save();

  const transaction = await CoinTransaction.create({
    customerId: new Types.ObjectId(input.customerId),
    walletId: wallet._id,
    type: "adjustment",
    amount: input.amount,
    balanceAfter: wallet.balance,
    description: input.description,
    createdBy: new Types.ObjectId(input.actorId),
  });

  return { wallet, transaction };
}
