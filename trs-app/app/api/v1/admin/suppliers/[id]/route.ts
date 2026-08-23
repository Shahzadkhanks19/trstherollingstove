import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { Supplier } from "@/models/Supplier";
import { updateSupplierSchema } from "@/validators/purchases";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("suppliers.read");
    const { id } = await context.params;

    await connectToDatabase();

    const supplier = await Supplier.findById(id).lean();

    if (!supplier) {
      throw new AppError("Supplier not found.", 404);
    }

    return successResponse(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "suppliers.manage",
    );
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateSupplierSchema,
    );

    await connectToDatabase();

    const supplier = await Supplier.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          ...(input.code
            ? { code: input.code.toUpperCase() }
            : {}),
          updatedBy: actor.id,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!supplier) {
      throw new AppError("Supplier not found.", 404);
    }

    return successResponse(
      supplier,
      "Supplier updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("suppliers.manage");
    const { id } = await context.params;
    await connectToDatabase();

    const [{ PurchaseOrder }, { SupplierPayment }] = await Promise.all([
      import("@/models/PurchaseOrder"),
      import("@/models/SupplierPayment"),
    ]);
    const [orderCount, paymentCount] = await Promise.all([
      PurchaseOrder.countDocuments({ supplierId: id }),
      SupplierPayment.countDocuments({ supplierId: id }),
    ]);
    if (orderCount > 0 || paymentCount > 0) {
      throw new AppError("This vendor has purchasing records and cannot be deleted. Deactivate it instead.", 409);
    }

    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) throw new AppError("Supplier not found.", 404);
    return successResponse({ id }, "Supplier deleted.");
  } catch (error) {
    return handleApiError(error);
  }
}
