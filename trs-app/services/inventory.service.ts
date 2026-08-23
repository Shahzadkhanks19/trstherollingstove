import { Types, type ClientSession } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import { MenuItemRecipe } from "@/models/MenuItemRecipe";

const INBOUND_TYPES = new Set([
  "opening",
  "purchase",
  "adjustment_in",
  "return_in",
  "transfer_in",
]);

type MovementType =
  | "opening"
  | "purchase"
  | "sale"
  | "adjustment_in"
  | "adjustment_out"
  | "wastage"
  | "return_in"
  | "return_out"
  | "transfer_in"
  | "transfer_out";

type RecordMovementInput = {
  inventoryItemId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number;
  referenceType?:
    | "manual"
    | "order"
    | "purchase"
    | "return"
    | "opening"
    | "transfer"
    | "stock_count"
    | "wastage";
  referenceId?: string | null;
  reason?: string;
  batchNumber?: string;
  expiryDate?: Date | null;
  actorId: string;
  session?: ClientSession;
};

export async function recordInventoryMovement(
  input: RecordMovementInput,
) {
  const quantity = input.quantity;
  const isInbound = INBOUND_TYPES.has(input.type);
  const unitCost = input.unitCost ?? 0;

  const query: Record<string, unknown> = {
    _id: input.inventoryItemId,
    isActive: true,
  };

  if (!isInbound) {
    query.currentStock = { $gte: quantity };
  }

  const update = isInbound
    ? [
        {
          $set: {
            averageUnitCost: {
              $cond: [
                { $gt: [quantity, 0] },
                {
                  $cond: [
                    { $gt: [unitCost, 0] },
                    {
                      $divide: [
                        {
                          $add: [
                            { $multiply: ["$currentStock", "$averageUnitCost"] },
                            quantity * unitCost,
                          ],
                        },
                        { $add: ["$currentStock", quantity] },
                      ],
                    },
                    "$averageUnitCost",
                  ],
                },
                "$averageUnitCost",
              ],
            },
            currentStock: { $add: ["$currentStock", quantity] },
            updatedBy: new Types.ObjectId(input.actorId),
            updatedAt: "$$NOW",
          },
        },
      ]
    : {
        $inc: { currentStock: -quantity },
        $set: {
          updatedBy: new Types.ObjectId(input.actorId),
        },
      };

  const itemBefore = await InventoryItem.findOneAndUpdate(
    query,
    update,
    {
      returnDocument: "before",
      session: input.session,
    },
  );

  if (!itemBefore) {
    const existingItem = await InventoryItem.findById(
      input.inventoryItemId,
    )
      .session(input.session ?? null)
      .select("name isActive currentStock")
      .lean();

    if (!existingItem) {
      throw new AppError("Inventory item not found.", 404);
    }

    if (!existingItem.isActive) {
      throw new AppError(
        "Inactive inventory items cannot be updated.",
        409,
      );
    }

    throw new AppError(
      `Insufficient stock for ${existingItem.name}.`,
      409,
    );
  }

  const stockBefore = itemBefore.currentStock;
  const stockAfter = isInbound
    ? stockBefore + quantity
    : stockBefore - quantity;
  const totalCost = unitCost * quantity;

  const [movement] = await InventoryMovement.create(
    [
      {
        inventoryItemId: itemBefore._id,
        type: input.type,
        quantity,
        stockBefore,
        stockAfter,
        unitCost,
        totalCost,
        referenceType: input.referenceType ?? "manual",
        referenceId: input.referenceId
          ? new Types.ObjectId(input.referenceId)
          : null,
        reason: input.reason ?? "",
        batchNumber: input.batchNumber ?? "",
        expiryDate: input.expiryDate ?? null,
        performedBy: new Types.ObjectId(input.actorId),
      },
    ],
    { session: input.session },
  );

  return movement;
}

type DeductOrderInput = {
  orderId: string;
  actorId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
};

export async function deductInventoryForOrder(
  input: DeductOrderInput,
) {
  const menuItemIds = input.items.map(
    (item) => new Types.ObjectId(item.menuItemId),
  );

  const recipes = await MenuItemRecipe.find({
    menuItemId: { $in: menuItemIds },
    isActive: true,
  }).lean();

  const recipeMap = new Map(
    recipes.map((recipe) => [
      String(recipe.menuItemId),
      recipe,
    ]),
  );

  const movements = [];

  for (const orderItem of input.items) {
    const recipe = recipeMap.get(
      orderItem.menuItemId,
    );

    if (!recipe) {
      continue;
    }

    for (const ingredient of recipe.ingredients) {
      const requiredQuantity =
        (ingredient.quantity *
          orderItem.quantity) /
        recipe.yieldQuantity;

      const movement =
        await recordInventoryMovement({
          inventoryItemId: String(
            ingredient.inventoryItemId,
          ),
          type: "sale",
          quantity: requiredQuantity,
          referenceType: "order",
          referenceId: input.orderId,
          reason: "Automatic deduction from completed order.",
          actorId: input.actorId,
        });

      movements.push(movement);
    }
  }

  return movements;
}
