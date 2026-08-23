import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { CoinWallet } from "@/models/CoinWallet";
import { LoyaltyMembership } from "@/models/LoyaltyMembership";
import { Order } from "@/models/Order";
import { Reservation } from "@/models/Reservation";
import { serializeCustomer } from "@/services/userManagement.service";

export async function getCustomerDashboardSummary(customerId: string) {
  await connectToDatabase();
  const id = new Types.ObjectId(customerId);
  const now = new Date();

  const [customer, orderCount, completedOrders, activeOrders, upcomingReservations, wallet, membership, recentOrders] =
    await Promise.all([
      serializeCustomer(customerId),
      Order.countDocuments({ customerId: id }),
      Order.countDocuments({ customerId: id, status: "completed" }),
      Order.countDocuments({ customerId: id, status: { $in: ["placed", "accepted", "preparing", "ready"] } }),
      Reservation.countDocuments({
        customerId: id,
        reservationDate: { $gte: now },
        status: { $in: ["pending", "confirmed"] },
      }),
      CoinWallet.findOne({ customerId: id }).lean(),
      LoyaltyMembership.findOne({ customerId: id }).lean(),
      Order.find({ customerId: id })
        .select("orderNumber status orderMode grandTotal itemCount createdAt estimatedReadyAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  return {
    customer,
    stats: {
      totalOrders: orderCount,
      completedOrders,
      activeOrders,
      upcomingReservations,
      coinBalance: wallet?.balance ?? 0,
      lifetimeCoinsEarned: wallet?.lifetimeEarned ?? 0,
      loyaltyTier: membership?.tierKey ?? "bronze",
      annualSpend: membership?.annualSpend ?? 0,
    },
    recentOrders: recentOrders.map((order) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      orderMode: order.orderMode,
      grandTotal: order.grandTotal,
      itemCount: order.itemCount,
      createdAt: order.createdAt,
      estimatedReadyAt: order.estimatedReadyAt,
    })),
  };
}
