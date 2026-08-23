import { Types } from "mongoose";

import { ModifierGroup } from "@/models/ModifierGroup";
import { POSItem } from "@/models/POSItem";

function normalizeSkuPart(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 36);
}

/** Keeps standalone Extra Naan counter items aligned with Menu Management prices. */
export async function syncExtraNaanPosItems(actorId: string) {
  const actorObjectId = new Types.ObjectId(actorId);
  const groups = await ModifierGroup.find({ isActive: true, name: { $regex: /extra\s*naan/i } })
    .select("name options")
    .lean();

  const activeSkus: string[] = [];
  for (const group of groups) {
    for (const [index, option] of group.options.entries()) {
      if (!option.isActive || !option.isAvailable) continue;
      const sku = `NAAN-${normalizeSkuPart(option.name)}-${String(option._id).slice(-6).toUpperCase()}`;
      activeSkus.push(sku);
      await POSItem.findOneAndUpdate(
        { sku },
        {
          $set: {
            name: option.name,
            category: "Extra Naans",
            description: "Standalone extra naan synced from the menu configuration.",
            sellingPrice: Number(option.price ?? 0),
            taxRate: 0,
            trackInventory: false,
            inventoryItemId: null,
            sendToKds: true,
            kitchenStationId: null,
            allowCustomPrice: false,
            isActive: true,
            sortOrder: index,
            updatedBy: actorObjectId,
          },
          $setOnInsert: { createdBy: actorObjectId },
        },
        { upsert: true, runValidators: true, returnDocument: "after" },
      );
    }
  }

  await POSItem.updateMany(
    { category: "Extra Naans", ...(activeSkus.length ? { sku: { $nin: activeSkus } } : {}) },
    { $set: { isActive: false, updatedBy: actorObjectId } },
  );
}
