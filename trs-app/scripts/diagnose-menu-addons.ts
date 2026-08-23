import mongoose, { Types } from "mongoose";

import { env } from "@/config/env";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asId(value: unknown): string {
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return record._id ? asId(record._id) : "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

async function main(): Promise<void> {
  const search = process.argv.slice(2).join(" ").trim();
  if (!search) {
    throw new Error('Provide the item slug or name, for example: npm run diagnose:menu-addons -- "cheese-burst-pizza"');
  }

  await mongoose.connect(env.MONGODB_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10_000,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is unavailable.");

  const menuItems = db.collection<UnknownRecord>("menuitems");
  const modifierGroups = db.collection<UnknownRecord>("modifiergroups");

  const exact = await menuItems.findOne({
    $or: [
      { slug: search.toLowerCase() },
      { name: { $regex: `^${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    ],
  });

  const item = exact ?? await menuItems.findOne({
    $or: [
      { slug: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ],
    deletedAt: null,
  });

  if (!item) throw new Error(`No menu item matched "${search}".`);

  const rawModifierIds = Array.isArray(item.modifierGroupIds)
    ? item.modifierGroupIds.map(asId).filter(Boolean)
    : [];
  const rawRecommendationIds = Array.isArray(item.frequentlyOrderedWithIds)
    ? item.frequentlyOrderedWithIds.map(asId).filter(Boolean)
    : [];

  console.log("\n=== MENU ITEM ===");
  console.log({
    id: asId(item._id),
    name: stringValue(item.name),
    slug: stringValue(item.slug),
    isActive: item.isActive,
    isAvailable: item.isAvailable,
    deletedAt: item.deletedAt ?? null,
    modifierGroupIds: rawModifierIds,
    frequentlyOrderedWithIds: rawRecommendationIds,
  });

  if (rawModifierIds.length === 0) {
    console.log("\nRESULT: No modifierGroupIds are stored on this menu item. The admin save/assignment path is the failing point.");
  } else {
    const validIds = rawModifierIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const groups = await modifierGroups.find({ _id: { $in: validIds } }).toArray();
    const byId = new Map(groups.map((group) => [asId(group._id), group]));

    console.log("\n=== LINKED MODIFIER GROUPS ===");
    for (const id of rawModifierIds) {
      const group = byId.get(id);
      if (!group) {
        console.log({ id, status: "BROKEN_REFERENCE", reason: "No modifiergroups document exists for this ID." });
        continue;
      }

      const options = Array.isArray(group.options) ? group.options.map(asRecord) : [];
      const activeOptions = options.filter((option) => option.isActive !== false && option.isAvailable !== false);
      const reasons: string[] = [];
      if (group.isActive === false) reasons.push("group is inactive");
      if (options.length === 0) reasons.push("group has no options");
      if (activeOptions.length === 0) reasons.push("group has no active/available options");

      console.log({
        id,
        name: stringValue(group.name),
        internalName: stringValue(group.internalName),
        isActive: group.isActive,
        optionCount: options.length,
        activeOptionCount: activeOptions.length,
        options: activeOptions.map((option) => ({
          id: asId(option._id),
          name: stringValue(option.name),
          price: option.price,
          variantPrices: Array.isArray(option.variantPrices) ? option.variantPrices : [],
          isActive: option.isActive,
          isAvailable: option.isAvailable,
        })),
        publicStatus: reasons.length ? "HIDDEN" : "VISIBLE",
        reasons,
      });
    }
  }

  if (rawRecommendationIds.length > 0) {
    const validIds = rawRecommendationIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const recommendations = await menuItems.find({ _id: { $in: validIds } }).toArray();
    const byId = new Map(recommendations.map((entry) => [asId(entry._id), entry]));
    console.log("\n=== MOSTLY BOUGHT TOGETHER ===");
    for (const id of rawRecommendationIds) {
      const entry = byId.get(id);
      console.log(entry ? {
        id,
        name: stringValue(entry.name),
        slug: stringValue(entry.slug),
        isActive: entry.isActive,
        isAvailable: entry.isAvailable,
        deletedAt: entry.deletedAt ?? null,
        publicStatus: entry.isActive !== false && entry.isAvailable !== false && entry.deletedAt == null ? "VISIBLE" : "HIDDEN",
      } : { id, status: "BROKEN_REFERENCE" });
    }
  } else {
    console.log("\nRESULT: No frequentlyOrderedWithIds are stored on this menu item.");
  }

  console.log("\nCopy the complete output back into ChatGPT. It contains no secrets or customer data.\n");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
