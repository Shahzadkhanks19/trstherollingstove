import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Supplier } from "@/models/Supplier";
import { createSupplierSchema } from "@/validators/purchases";

export async function GET(request: Request) {
  try {
    await requirePermission("suppliers.read");
    await connectToDatabase();

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const active = url.searchParams.get("active");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          code: {
            $regex: search,
            $options: "i",
          },
        },
        {
          contactPerson: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (active === "true") {
      filter.isActive = true;
    }

    if (active === "false") {
      filter.isActive = false;
    }

    const suppliers = await Supplier.find(filter)
      .sort({ name: 1 })
      .lean();

    return successResponse(suppliers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      "suppliers.manage",
    );
    const input = await validateRequestBody(
      request,
      createSupplierSchema,
    );

    await connectToDatabase();

    const supplier = await Supplier.create({
      ...input,
      code: input.code.toUpperCase(),
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    return successResponse(
      supplier,
      "Supplier created.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
