import crypto from "node:crypto";
import { Types } from "mongoose";

import { hashPassword } from "@/lib/auth/password";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CustomerProfile } from "@/models/CustomerProfile";
import { Invoice } from "@/models/Invoice";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { publishPosCustomerChanged } from "@/services/realtimeEvents.service";
import { getCustomerRoleId } from "@/services/userManagement.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Context = { params: Promise<{ id: string }> };
type CustomerIdentity = { id: string; objectId: Types.ObjectId; name: string; phone: string; email: string };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePermission("pos.use");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) throw new AppError("Order not found.", 404);
    const body = await request.json() as { customerId?: unknown; name?: unknown; phone?: unknown; email?: unknown };
    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) throw new AppError("Order not found.", 404);
    if (order.saleType !== "customer") throw new AppError("Customer details cannot be attached to an internal-consumption order.", 409);

    let identity: CustomerIdentity;
    const selectedCustomerId = typeof body.customerId === "string" ? body.customerId : "";
    if (selectedCustomerId) {
      if (!Types.ObjectId.isValid(selectedCustomerId)) throw new AppError("Selected customer is invalid.", 422);
      const selected = await User.findOne({ _id: selectedCustomerId, isActive: true, deletedAt: null }).select("name phone email").lean();
      if (!selected) throw new AppError("Selected customer is unavailable.", 404);
      identity = { id: String(selected._id), objectId: new Types.ObjectId(selected._id), name: selected.name, phone: selected.phone ?? "", email: selected.email ?? "" };
    } else {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
      const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
      const suppliedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (name.length < 2) throw new AppError("Customer name must contain at least two characters.", 422);
      if (!/^[6-9]\d{9}$/.test(phone)) throw new AppError("Enter a valid 10-digit Indian mobile number.", 422);
      if (suppliedEmail && !/^\S+@\S+\.\S+$/.test(suppliedEmail)) throw new AppError("Enter a valid email address.", 422);

      const duplicate = await User.findOne({ $or: [{ phone }, ...(suppliedEmail ? [{ email: suppliedEmail }] : [])] }).select("name phone email isActive").lean();
      if (duplicate && !duplicate.isActive) throw new AppError("A matching customer exists but is inactive.", 409);
      if (duplicate) {
        identity = { id: String(duplicate._id), objectId: new Types.ObjectId(duplicate._id), name: duplicate.name, phone: duplicate.phone ?? "", email: duplicate.email ?? "" };
      } else {
        const roleId = await getCustomerRoleId();
        const created = await User.create({ name, phone, email: suppliedEmail || `pos-${phone}@customer.trs.local`, roleId, passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")), isActive: true, createdBy: actor.id });
        await CustomerProfile.create({ userId: created._id, source: "pos" });
        publishPosCustomerChanged({ customerId: created.id, action: "created", actorId: actor.id });
        identity = { id: created.id, objectId: created._id, name: created.name, phone: created.phone ?? "", email: created.email };
      }
    }

    const snapshot = { name: identity.name, phone: identity.phone, email: identity.email };
    order.customerId = identity.objectId;
    order.customerSnapshot = snapshot;
    order.updatedBy = new Types.ObjectId(actor.id);
    await Promise.all([
      order.save(),
      Invoice.updateOne({ orderId: order._id }, { $set: { customerSnapshot: snapshot } }),
      writeAuditLog({ actor, action: "pos.order_customer_attached", module: "pos", entityType: "order", entityId: order.id, description: `Customer ${snapshot.name} attached to ${order.orderNumber}.`, metadata: { customerId: identity.id } }),
    ]);
    return successResponse({ customer: { id: identity.id, ...snapshot, isWalkIn: false } }, "Customer attached to order and invoice.");
  } catch (error) {
    return handleApiError(error);
  }
}
