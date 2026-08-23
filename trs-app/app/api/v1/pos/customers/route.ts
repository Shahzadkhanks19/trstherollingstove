import crypto from "node:crypto";

import { requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { CustomerProfile } from "@/models/CustomerProfile";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { publishPosCustomerChanged } from "@/services/realtimeEvents.service";
import { getCustomerRoleId } from "@/services/userManagement.service";

function normalizePhone(value: unknown) {
  const phone = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (phone.length !== 10) throw new AppError("Enter a valid 10-digit mobile number.", 422);
  return phone;
}

function serialize(user: { _id: unknown; name: string; phone?: string | null; email: string }) {
  return {
    id: String(user._id),
    name: user.name,
    phone: user.phone ?? "",
    email: user.email,
    isWalkIn: false,
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission("pos.use");
    await connectToDatabase();
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return successResponse([], "Enter at least two characters.");

    const roleId = await getCustomerRoleId();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const customers = await User.find({
      roleId,
      isActive: true,
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ],
    })
      .select("name phone email")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return successResponse(customers.map(serialize), "Customers loaded.");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("pos.use");
    const input = (await request.json()) as { name?: unknown; phone?: unknown; email?: unknown };
    const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
    if (name.length < 2) throw new AppError("Customer name must contain at least two characters.", 422);
    const phone = normalizePhone(input.phone);
    const suppliedEmail = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (suppliedEmail && !/^\S+@\S+\.\S+$/.test(suppliedEmail)) throw new AppError("Enter a valid email address.", 422);

    await connectToDatabase();
    const duplicate = await User.findOne({ $or: [{ phone }, ...(suppliedEmail ? [{ email: suppliedEmail }] : [])] })
      .select("name phone email roleId isActive")
      .lean();
    if (duplicate) {
      if (!duplicate.isActive) throw new AppError("A matching customer exists but is inactive.", 409);
      return successResponse(serialize(duplicate), "Existing customer selected.");
    }

    const roleId = await getCustomerRoleId();
    const email = suppliedEmail || `pos-${phone}@customer.trs.local`;
    const user = await User.create({
      name,
      phone,
      email,
      roleId,
      passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
      isActive: true,
      createdBy: actor.id,
    });
    await CustomerProfile.create({ userId: user._id, source: "pos" });

    await writeAuditLog({
      actor: actor,
      action: "pos.customer_created",
      module: "pos",
      entityType: "user",
      entityId: user.id,
      description: `POS customer ${name} created.`,
      metadata: { phone, emailProvided: Boolean(suppliedEmail) },
    });
    publishPosCustomerChanged({ customerId: user.id, action: "created", actorId: actor.id });
    return successResponse(serialize(user), "Customer created.", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
