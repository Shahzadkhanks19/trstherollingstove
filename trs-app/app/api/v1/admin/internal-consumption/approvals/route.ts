import { Types } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";
import { Order } from "@/models/Order";
import { internalApprovalDecisionSchema } from "@/validators/internalConsumption";

export async function GET() {
  try {
    await requirePermission("orders.manage");
    await connectToDatabase();
    const orders = await Order.find({ isRevenueOrder: false, "internalConsumption.approvalStatus": "required" })
      .select("orderNumber saleType items internalConsumption createdAt cashierId")
      .populate("cashierId", "name email")
      .sort({ createdAt: 1 }).limit(200).lean();
    return successResponse(orders, "Pending approvals loaded.");
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("orders.manage");
    const input = internalApprovalDecisionSchema.parse(await request.json());
    if (!Types.ObjectId.isValid(input.orderId)) throw new AppError("Invalid order.", 422);
    await connectToDatabase();
    const order = await Order.findOne({ _id: input.orderId, isRevenueOrder: false, "internalConsumption.approvalStatus": "required" });
    if (!order) throw new AppError("Pending approval not found.", 404);
    if (input.decision === "approve") {
      order.set("internalConsumption.approvalStatus", "approved");
      order.set("internalConsumption.approvalReason", input.comments);
      order.set("internalConsumption.approvedBy", actor.id);
      order.set("internalConsumption.approvedAt", new Date());
    } else {
      order.set("internalConsumption.approvalStatus", "rejected");
      order.set("internalConsumption.approvalReason", input.comments);
      order.set("internalConsumption.approvedBy", actor.id);
      order.set("internalConsumption.approvedAt", new Date());
      order.status = "cancelled";
    }
    await order.save();
    await InternalConsumptionAudit.create({ action: input.decision === "approve" ? "approved" : "rejected", actorId: actor.id, actorName: "", subjectId: order._id, subjectName: order.orderNumber, metadata: { comments: input.comments, saleType: order.saleType } });
    return successResponse(order, input.decision === "approve" ? "Order approved." : "Order rejected.");
  } catch (error) { return handleApiError(error); }
}
