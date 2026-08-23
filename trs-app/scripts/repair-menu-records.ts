import { config } from "dotenv";
import { Types } from "mongoose";

config({ path: ".env.local" });

async function main() {
  const [{ connectToDatabase }, { MenuItem }, { ModifierGroup }] =
    await Promise.all([
      import("../lib/db/mongoose"),
      import("../models/MenuItem"),
      import("../models/ModifierGroup"),
    ]);

  await connectToDatabase();

  const activeModifierIds = new Set(
    (
      await ModifierGroup.find({ isActive: true })
        .select("_id")
        .lean()
    ).map((group) => String(group._id)),
  );

  const liveItemIds = new Set(
    (
      await MenuItem.find({ deletedAt: null })
        .select("_id")
        .lean()
    ).map((item) => String(item._id)),
  );

  const items = await MenuItem.find({});
  let repaired = 0;
  let removedModifierLinks = 0;
  let removedRecommendationLinks = 0;

  for (const item of items) {
    const currentModifierIds = Array.isArray(item.modifierGroupIds)
      ? item.modifierGroupIds.map(String)
      : [];
    const currentRelatedIds = Array.isArray(item.frequentlyOrderedWithIds)
      ? item.frequentlyOrderedWithIds.map(String)
      : [];

    const nextModifierIds = [...new Set(currentModifierIds)].filter((id) =>
      activeModifierIds.has(id),
    );
    const nextRelatedIds = [...new Set(currentRelatedIds)].filter(
      (id) => id !== String(item._id) && liveItemIds.has(id),
    );

    const modifierChanged =
      nextModifierIds.join(",") !== currentModifierIds.join(",");
    const relatedChanged =
      nextRelatedIds.join(",") !== currentRelatedIds.join(",");
    const missingArrays =
      !Array.isArray(item.modifierGroupIds) ||
      !Array.isArray(item.frequentlyOrderedWithIds);

    if (!modifierChanged && !relatedChanged && !missingArrays) continue;

    removedModifierLinks += currentModifierIds.length - nextModifierIds.length;
    removedRecommendationLinks += currentRelatedIds.length - nextRelatedIds.length;

    item.set(
      "modifierGroupIds",
      nextModifierIds.map((id) => new Types.ObjectId(id)),
    );
    item.set(
      "frequentlyOrderedWithIds",
      nextRelatedIds.map((id) => new Types.ObjectId(id)),
    );
    item.markModified("modifierGroupIds");
    item.markModified("frequentlyOrderedWithIds");
    await item.save();
    repaired += 1;
  }

  console.log(
    JSON.stringify(
      {
        inspected: items.length,
        repaired,
        removedModifierLinks,
        removedRecommendationLinks,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
