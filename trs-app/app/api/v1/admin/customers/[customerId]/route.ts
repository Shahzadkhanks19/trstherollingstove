import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { CustomerProfile } from "@/models/CustomerProfile";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { writeAuditLog } from "@/services/audit.service";
import { publishCustomerUpdated } from "@/services/realtimeEvents.service";
import { applyActivationState, revokeUserSessions, serializeCustomer } from "@/services/userManagement.service";
import { customerUpdateSchema } from "@/validators/userManagement";

async function customer(id: string) { const user = await User.findById(id); const role = user && await Role.findById(user.roleId).lean(); if (!user || role?.key !== "customer") throw new AppError("Customer not found.", 404); return user; }
export async function GET(_: Request, c: { params: Promise<{ customerId: string }> }) { try { await requirePermission("users.read"); await connectToDatabase(); const { customerId } = await c.params; await customer(customerId); return successResponse(await serializeCustomer(customerId), "Customer loaded."); } catch (e) { return handleApiError(e); } }
export async function PATCH(request: Request, c: { params: Promise<{ customerId: string }> }) {
  try {
    const actor = await requirePermission("users.update"); const { customerId } = await c.params; const input = await validateRequestBody(request, customerUpdateSchema); await connectToDatabase();
    const user = await customer(customerId); if (input.name !== undefined) user.name = input.name; if (input.phone !== undefined) user.phone = input.phone ?? undefined; if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    let changed = false; if (input.isActive !== undefined) changed = applyActivationState(user, input.isActive, actor.id, input.deactivationReason ?? ""); await user.save();
    if (changed && !user.isActive) await revokeUserSessions(user.id, "Customer deactivated.");
    if (input.profile) { const profile = await CustomerProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, returnDocument: "after" }); if (!profile) throw new AppError("Customer profile unavailable.", 500); Object.assign(profile, { ...input.profile, dateOfBirth: input.profile.dateOfBirth ? new Date(input.profile.dateOfBirth) : input.profile.dateOfBirth, anniversary: input.profile.anniversary ? new Date(input.profile.anniversary) : input.profile.anniversary }); await profile.save(); }
    await writeAuditLog({ actorUserId: actor.id, action: "customer.updated", entityType: "user", entityId: user.id, description: `Customer ${user.email} updated.` });
    publishCustomerUpdated({
      customerId: user.id,
      action: changed ? (user.isActive ? "activated" : "deactivated") : "updated",
      actorId: actor.id,
    });
    return successResponse(await serializeCustomer(user.id), "Customer updated.");
  } catch (e) { return handleApiError(e); }
}
