import { Types } from "mongoose";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { validateRequestBody } from "@/lib/validation/validateRequest";
import { InventoryItem } from "@/models/InventoryItem";
import { GoodsReceipt } from "@/models/GoodsReceipt";
import { InventoryAlertEvent } from "@/models/InventoryAlertEvent";
import { InventoryAlertRule } from "@/models/InventoryAlertRule";
import { InventoryForecastSnapshot } from "@/models/InventoryForecastSnapshot";
import { InventoryMovement } from "@/models/InventoryMovement";
import { MenuItemRecipe } from "@/models/MenuItemRecipe";
import { POSItem } from "@/models/POSItem";
import { POSItemRecipe } from "@/models/POSItemRecipe";
import { ProductionBatch } from "@/models/ProductionBatch";
import { ProductionOrder } from "@/models/ProductionOrder";
import { PurchaseOrder } from "@/models/PurchaseOrder";
import { PurchaseReturn } from "@/models/PurchaseReturn";
import { StockCount } from "@/models/StockCount";
import { StockTransfer } from "@/models/StockTransfer";
import { VendorQuote } from "@/models/VendorQuote";
import { WasteEntry } from "@/models/WasteEntry";
import { updateInventoryItemSchema } from "@/validators/inventory";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requirePermission("inventory.read");
    const { id } = await context.params;

    await connectToDatabase();

    const item = await InventoryItem.findById(id).lean();

    if (!item) {
      throw new AppError(
        "Inventory item not found.",
        404,
      );
    }

    return successResponse(item);
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
      "inventory.manage",
    );
    const { id } = await context.params;
    const input = await validateRequestBody(
      request,
      updateInventoryItemSchema,
    );

    await connectToDatabase();

    const item = await InventoryItem.findByIdAndUpdate(
      id,
      {
        $set: {
          ...input,
          ...(input.sku
            ? { sku: input.sku.toUpperCase() }
            : {}),
          updatedBy: actor.id,
          ...(input.isActive === true
            ? {
                archivedAt: null,
                archivedBy: null,
              }
            : {}),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!item) {
      throw new AppError(
        "Inventory item not found.",
        404,
      );
    }

    return successResponse(
      item,
      "Inventory item updated.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}


export async function DELETE(
  request: Request,
  context: Context,
) {
  try {
    const actor = await requirePermission(
      "inventory.manage",
    );
    const { id } = await context.params;
    const url = new URL(request.url);
    const permanent =
      url.searchParams.get("permanent") === "true";

    await connectToDatabase();

    const item = await InventoryItem.findById(id);

    if (!item) {
      throw new AppError(
        "Inventory item not found.",
        404,
      );
    }

    if (!permanent) {
      if (!item.isActive) {
        return successResponse(
          item,
          "Inventory item is already archived.",
        );
      }

      const actorObjectId = new Types.ObjectId(actor.id);

      item.isActive = false;
      item.archivedAt = new Date();
      item.archivedBy = actorObjectId;
      item.updatedBy = actorObjectId;
      await item.save();

      return successResponse(
        item,
        "Inventory item archived. Historical stock records were preserved.",
      );
    }

    if (item.isActive) {
      throw new AppError(
        "Archive this inventory item before permanently deleting it.",
        409,
      );
    }

    /*
     * Operational records must never be cascaded because they are part of
     * real business history. Auto-generated inventory-only records may be
     * removed together with an unused test item.
     */
    const operationalChecks = await Promise.all([
      MenuItemRecipe.countDocuments({ inventoryItemId: item._id }),
      POSItemRecipe.countDocuments({ inventoryItemId: item._id }),
      POSItem.countDocuments({ inventoryItemId: item._id }),
      PurchaseOrder.countDocuments({ "items.inventoryItemId": item._id }),
      PurchaseReturn.countDocuments({ "items.inventoryItemId": item._id }),
      GoodsReceipt.countDocuments({ "items.inventoryItemId": item._id }),
      StockCount.countDocuments({ "items.inventoryItemId": item._id }),
      StockTransfer.countDocuments({ "items.inventoryItemId": item._id }),
      WasteEntry.countDocuments({ inventoryItemId: item._id }),
      VendorQuote.countDocuments({ "items.inventoryItemId": item._id }),
      ProductionOrder.countDocuments({ "items.inventoryItemId": item._id }),
      ProductionBatch.countDocuments({ "items.inventoryItemId": item._id }),
    ]);

    const operationalLabels = [
      "menu recipes",
      "POS recipes",
      "POS item mappings",
      "purchase orders",
      "purchase returns",
      "goods receipts",
      "stock counts",
      "stock transfers",
      "wastage entries",
      "vendor quotations",
      "production orders",
      "production batches",
    ];

    const blockingDependencies = operationalChecks
      .map((count, index) => ({
        label: operationalLabels[index],
        count,
      }))
      .filter((entry) => entry.count > 0);

    if (blockingDependencies.length > 0) {
      const summary = blockingDependencies
        .map((entry) => `${entry.label}: ${entry.count}`)
        .join(", ");

      throw new AppError(
        `This item has real operational history and cannot be permanently deleted (${summary}). Keep it archived instead.`,
        409,
      );
    }

    /*
     * This deployment does not support MongoDB transactions. Generated,
     * non-operational records are therefore removed first, and the archived
     * inventory item is deleted last. If an earlier deletion fails, the item
     * remains archived and the request can be retried safely.
     */
    const [
      movementResult,
      forecastResult,
      alertRuleResult,
      alertEventResult,
    ] = await Promise.all([
      InventoryMovement.deleteMany({
        inventoryItemId: item._id,
      }),
      InventoryForecastSnapshot.deleteMany({
        inventoryItemId: item._id,
      }),
      InventoryAlertRule.deleteMany({
        inventoryItemId: item._id,
      }),
      InventoryAlertEvent.deleteMany({
        inventoryItemId: item._id,
      }),
    ]);

    const deleteResult = await InventoryItem.deleteOne({
      _id: item._id,
      isActive: false,
    });

    if (deleteResult.deletedCount !== 1) {
      throw new AppError(
        "Inventory item could not be permanently deleted. Refresh the inventory page and try again.",
        409,
      );
    }

    return successResponse(
      {
        id: String(item._id),
        permanentlyDeleted: true,
        deletedRelatedRecords: {
          stockMovements: movementResult.deletedCount,
          inventoryForecasts: forecastResult.deletedCount,
          inventoryAlertRules: alertRuleResult.deletedCount,
          inventoryAlertEvents: alertEventResult.deletedCount,
        },
      },
      "Inventory item and its generated inventory records were permanently deleted.",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
