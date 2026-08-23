import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { Order } from "@/models/Order";
import { InternalConsumptionAudit } from "@/models/InternalConsumptionAudit";

const saleTypes = new Set(["staff_meal", "family_meal", "complimentary", "food_wastage", "kitchen_test"]);

export async function GET(request: Request) {
  try {
    await requirePermission("reports.read");
    await connectToDatabase();
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(100, Math.max(10, Number(params.get("limit") || 25)));
    const saleType = params.get("saleType") || "all";
    const query = (params.get("q") || "").trim();
    const from = params.get("from");
    const to = params.get("to");
    const filter: Record<string, unknown> = { saleType: saleType === "all" ? { $in: [...saleTypes] } : saleTypes.has(saleType) ? saleType : { $in: [...saleTypes] } };
    if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(`${from}T00:00:00+05:30`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}) };
    if (query) filter.$or = [
      { orderNumber: { $regex: query, $options: "i" } },
      { "internalConsumption.personName": { $regex: query, $options: "i" } },
      { "internalConsumption.reason": { $regex: query, $options: "i" } },
    ];
    const [records, total, audit] = await Promise.all([
      Order.find(filter).select("orderNumber saleType status createdAt items internalConsumption cashierId").populate("cashierId", "name").populate("internalConsumption.approvedBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
      InternalConsumptionAudit.find({}).select("action saleType subjectName actorName reason metadata createdAt").sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return successResponse({ records, audit, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, "Internal consumption records loaded.");
  } catch (error) { return handleApiError(error); }
}
