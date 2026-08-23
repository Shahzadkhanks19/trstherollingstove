import { randomBytes } from "node:crypto";

import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { ReviewRequest } from "@/models/ReviewRequest";

async function main() {
  await connectToDatabase();

  const since = new Date(Date.now() - 7 * 86_400_000);
  const orders = await Order.find({
    status: "completed",
    completedAt: { $gte: since },
    customerId: { $ne: null },
  })
    .select("_id customerId completedAt")
    .lean();

  let created = 0;

  for (const order of orders) {
    if (!order.customerId) continue;
    if (await Review.exists({ orderId: order._id })) continue;

    const exists = await ReviewRequest.exists({
      orderId: order._id,
      channel: "email",
    });
    if (exists) continue;

    const reviewRequest = new ReviewRequest({
      customerId: order.customerId,
      orderId: order._id,
      channel: "email",
      scheduledFor: new Date(),
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    });

    await reviewRequest.save();
    created += 1;
  }

  console.log({ scanned: orders.length, created });
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
