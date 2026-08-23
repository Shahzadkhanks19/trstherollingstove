import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { MenuCategory } from "@/models/MenuCategory";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { isThinCrustEnabled, thinCrustGroupId, thinCrustOptionId } from "@/lib/menu-special-config";
import type {
  MenuItemDetails,
  MenuItemSummary,
  MenuOptionGroup,
  MenuPriceOption,
} from "@/types/menu";

type LeanRecord = Record<string, unknown>;

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value ?? "");
}


function categoryIdentity(category: { name?: string; slug?: string }): string {
  return `${category.slug ?? ""} ${category.name ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function isPizzaCategory(category: { name?: string; slug?: string }): boolean {
  return categoryIdentity(category).includes("pizza");
}

function isChurChurNaanCategory(category: { name?: string; slug?: string }): boolean {
  const identity = categoryIdentity(category);
  return identity.includes("chur") && identity.includes("naan");
}

function inferOptionCode(name: string): MenuOptionGroup["code"] {
  const value = name.toLowerCase();

  if (value.includes("cook")) return "cooking_instruction";
  if (value.includes("spice")) return "spice_level";
  if (value.includes("season")) return "seasoning";
  if (value.includes("sweet")) return "sweetness";
  if (value.includes("ice")) return "ice_preference";
  if (value.includes("dip")) return "dips";
  if (value.includes("sabji") || value.includes("sabzi") || value.includes("chole") || value.includes("kadhai paneer")) return "sabji_choice";
  if (value.includes("extra naan")) return "extra_naan";
  if (value.includes("extra cheese") || value === "cheese") return "extra_cheese";
  if (value.includes("topping")) return "extra_toppings";
  if (value.includes("size")) return "size";
  if (value.includes("portion") || value.includes("half") || value.includes("full")) {
    return "portion";
  }

  return "other";
}

function isPosOnlyGroup(name: string): boolean {
  const value = name.toLowerCase();

  return [
    "extra raita",
    "extra dal",
    "dal makhani",
    "extra chole",
    "extra paneer",
    "extra sabji",
    "extra sabzi",
  ].some((term) => value.includes(term));
}

function mapVariants(item: LeanRecord): MenuPriceOption[] {
  const variants = Array.isArray(item.variants) ? item.variants : [];

  const mapped = variants
    .filter((variant): variant is LeanRecord => Boolean(variant && typeof variant === "object"))
    .filter((variant) => variant.isActive !== false)
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    )
    .map((variant) => ({
      id: asString(variant._id),
      label: String(variant.name ?? "Regular"),
      price: Number(variant.price ?? 0),
      compareAtPrice:
        variant.compareAtPrice == null
          ? null
          : Number(variant.compareAtPrice),
      isDefault: Boolean(variant.isDefault),
      isAvailable: variant.isActive !== false,
    }));

  if (mapped.length) return mapped;

  return [
    {
      id: `${asString(item._id)}-base`,
      label: "Regular",
      price: Number(item.basePrice ?? 0),
      compareAtPrice:
        item.compareAtPrice == null ? null : Number(item.compareAtPrice),
      isDefault: true,
      isAvailable: true,
    },
  ];
}

function mapModifierGroups(item: LeanRecord): MenuOptionGroup[] {
  const groups = Array.isArray(item.modifierGroupIds)
    ? item.modifierGroupIds
    : [];

  const mappedGroups = groups
    .filter((group): group is LeanRecord => Boolean(group && typeof group === "object"))
    .filter((group) => group.isActive !== false)
    .filter((group) => !isPosOnlyGroup(String(group.internalName ?? group.name ?? "")))
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    )
    .map((group) => {
      const groupName = String(group.name ?? "Options");
      const options = Array.isArray(group.options) ? group.options : [];

      return {
        id: asString(group._id),
        name: groupName,
        code: inferOptionCode(
          String(group.internalName ?? group.name ?? ""),
        ),
        selectionType:
          group.selectionType === "single"
            ? "single"
            : group.selectionType === "quantity"
              ? "quantity"
              : "multiple",
        required: Boolean(group.isRequired),
        minSelections: Number(group.minSelections ?? 0),
        maxSelections: Number(group.maxSelections ?? 1),
        choices: options
          .filter(
            (option): option is LeanRecord =>
              Boolean(option && typeof option === "object"),
          )
          .filter((option) => option.isActive !== false)
          .sort(
            (a, b) =>
              Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
          )
          .map((option) => ({
            id: asString(option._id),
            name: String(option.name ?? "Option"),
            price: Number(option.price ?? 0),
            variantPrices: Array.isArray(option.variantPrices)
              ? option.variantPrices
                  .filter(
                    (entry): entry is LeanRecord =>
                      Boolean(entry && typeof entry === "object"),
                  )
                  .map((entry) => ({
                    variantLabel: String(entry.variantLabel ?? ""),
                    price: Number(entry.price ?? 0),
                  }))
                  .filter((entry) => entry.variantLabel.length > 0)
              : [],
            isDefault: Boolean(option.isDefault),
            isAvailable:
              option.isActive !== false && option.isAvailable !== false,
            maxQuantity: Number(option.maxQuantity ?? 1),
          })),
      } satisfies MenuOptionGroup;
    });

  const category = mapCategory(item.categoryId);
  const itemId = asString(item._id);
  const pizzaConfiguration =
    item.pizzaConfiguration && typeof item.pizzaConfiguration === "object"
      ? (item.pizzaConfiguration as LeanRecord)
      : null;

  if (isPizzaCategory(category) && isThinCrustEnabled(String(item.name ?? ""), {
    thinCrustAvailable: pizzaConfiguration?.thinCrustAvailable !== false,
    thinCrustPriceAdjustment: 0,
  })) {
    mappedGroups.unshift({
      id: thinCrustGroupId(itemId),
      name: "Crust",
      code: "crust",
      selectionType: "single",
      required: false,
      minSelections: 0,
      maxSelections: 1,
      choices: [{
        id: thinCrustOptionId(itemId),
        name: "Thin Crust",
        price: 0,
        variantPrices: [],
        isDefault: false,
        isAvailable: true,
        maxQuantity: 1,
      }],
    });
  }

  return mappedGroups;
}


function mapCombinationPricing(item: LeanRecord) {
  const raw = item.combinationPricing;
  if (!raw || typeof raw !== "object") return null;
  const record = raw as LeanRecord;
  if (record.enabled !== true) return null;
  const entries = Array.isArray(record.entries) ? record.entries : [];
  return {
    enabled: true,
    modifierGroupId: record.modifierGroupId ? asString(record.modifierGroupId) : null,
    entries: entries
      .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
      .map((entry) => ({
        variantLabel: String(entry.variantLabel ?? ""),
        optionId: asString(entry.optionId),
        optionName: String(entry.optionName ?? ""),
        price: Number(entry.price ?? 0),
      }))
      .filter((entry) => entry.variantLabel && entry.optionId && entry.optionName),
  };
}

function mapCategory(category: unknown) {
  const record =
    category && typeof category === "object"
      ? (category as LeanRecord)
      : {};

  return {
    id: asString(record._id),
    name: String(record.name ?? "Menu"),
    slug: String(record.slug ?? "menu"),
  };
}

function mapSummary(item: LeanRecord): MenuItemSummary {
  const category = mapCategory(item.categoryId);
  const pricingOptions = mapVariants(item);
  const priceFrom = Math.min(...pricingOptions.map((option) => option.price));
  const lowestPriceOption = pricingOptions.find((option) => option.price === priceFrom);

  return {
    id: asString(item._id),
    slug: String(item.slug ?? ""),
    name: String(item.name ?? "Menu Item"),
    shortDescription: String(item.shortDescription ?? ""),
    category,
    thumbnail: item.imageUrl
      ? {
          id: `${asString(item._id)}-thumbnail`,
          url: String(item.imageUrl),
          alt: String(item.name ?? "Menu item"),
        }
      : null,
    priceFrom,
    compareAtPriceFrom:
      lowestPriceOption?.compareAtPrice != null && lowestPriceOption.compareAtPrice > priceFrom
        ? lowestPriceOption.compareAtPrice
        : item.compareAtPrice == null ? null : Number(item.compareAtPrice),
    pricingOptions,
    isVegetarian: item.foodType !== "non_veg",
    isBestseller: Boolean(item.isBestseller),
    isCombo: Boolean(item.isCombo),
    comboOfferType: item.comboOfferType === "limited" ? "limited" : "permanent",
    comboOfferStartsAt: item.comboOfferStartsAt == null ? null : new Date(String(item.comboOfferStartsAt)).toISOString(),
    comboOfferExpiresAt: item.comboOfferExpiresAt == null ? null : new Date(String(item.comboOfferExpiresAt)).toISOString(),
    publishComboOnMenuPage: item.publishComboOnMenuPage !== false,
    publishComboOnOffersPage: Boolean(item.publishComboOnOffersPage),
    comboOffersPageSection: item.comboOffersPageSection === "todays" ? "todays" : "permanent",
    eligibleTierKeys: Array.isArray(item.eligibleTierKeys) && item.eligibleTierKeys.length ? item.eligibleTierKeys.map(String) as Array<"bronze" | "silver" | "gold" | "platinum"> : ["bronze", "silver", "gold", "platinum"],
    isNew: Array.isArray(item.tags)
      ? item.tags.some((tag) => String(tag).toLowerCase() === "new")
      : false,
    isTodaysSpecialOffer:
      item.isTodaysSpecialOffer === true &&
      item.todaysSpecialOfferStartsAt != null &&
      item.todaysSpecialOfferExpiresAt != null &&
      new Date(String(item.todaysSpecialOfferStartsAt)).getTime() <= Date.now() &&
      new Date(String(item.todaysSpecialOfferExpiresAt)).getTime() > Date.now(),
    todaysSpecialOfferExpiresAt:
      item.todaysSpecialOfferExpiresAt == null
        ? null
        : new Date(String(item.todaysSpecialOfferExpiresAt)).toISOString(),
    isAvailable:
      item.isActive !== false &&
      item.isAvailable !== false &&
      item.deletedAt == null,
  };
}

export async function getPublicMenuItems(): Promise<MenuItemSummary[]> {
  await connectToDatabase();

  const items = (await MenuItem.find({
    deletedAt: null,
    isActive: true,
  })
    .populate({ path: "categoryId", model: MenuCategory, select: "name slug" })
    .sort({ sortOrder: 1, name: 1 })
    .lean()) as unknown as LeanRecord[];

  return items
    .map(mapSummary)
    .filter((item) => item.slug.length > 0);
}

export async function getPublicMenuItemBySlug(
  slug: string,
): Promise<MenuItemDetails | null> {
  await connectToDatabase();

  const item = (await MenuItem.findOne({
    slug,
    deletedAt: null,
    isActive: true,
  })
    .populate({ path: "categoryId", model: MenuCategory, select: "name slug" })
    .populate({
      path: "modifierGroupIds",
      model: ModifierGroup,
      match: { isActive: true },
    })
    .populate({
      path: "frequentlyOrderedWithIds",
      model: MenuItem,
      match: { deletedAt: null, isActive: true, isAvailable: true },
      select: "name slug shortDescription categoryId imageUrl basePrice compareAtPrice variants foodType tags isBestseller isAvailable isActive deletedAt",
      populate: { path: "categoryId", model: MenuCategory, select: "name slug" },
    })
    .lean()) as unknown as LeanRecord | null;

  if (!item) return null;

  const summary = mapSummary(item);
  const currentItemId = asString(item._id);
  const categoryId = asString(item.categoryId);
  const mixedNaanOptions =
    isChurChurNaanCategory(summary.category) &&
    Types.ObjectId.isValid(currentItemId) &&
    Types.ObjectId.isValid(categoryId)
      ? ((await MenuItem.find({
          _id: { $ne: new Types.ObjectId(currentItemId) },
          categoryId: new Types.ObjectId(categoryId),
          deletedAt: null,
          isActive: true,
          isAvailable: true,
          "combinationPricing.enabled": true,
        })
          .select("name combinationPricing sortOrder")
          .sort({ sortOrder: 1, name: 1 })
          .lean()) as unknown as LeanRecord[])
        .map((candidate) => ({
          menuItemId: asString(candidate._id),
          name: asString(candidate.name),
          prices: mapCombinationPricing(candidate)?.entries ?? [],
        }))
        .filter((candidate) =>
          candidate.menuItemId &&
          candidate.name &&
          candidate.prices.some((entry) =>
            entry.variantLabel.toLowerCase().includes("full"),
          ),
        )
    : [];
  const galleryUrls = Array.isArray(item.galleryUrls)
    ? item.galleryUrls.map(String).filter(Boolean)
    : [];

  const mediaUrls = [
    ...(item.imageUrl ? [String(item.imageUrl)] : []),
    ...galleryUrls,
  ];

  return {
    ...summary,
    description:
      String(item.description ?? "") ||
      String(item.shortDescription ?? ""),
    ingredients: Array.isArray(item.tags)
      ? item.tags.map(String)
      : [],
    allergens: Array.isArray(item.allergens)
      ? item.allergens.map(String)
      : [],
    nutrition:
      item.calories == null
        ? null
        : {
            calories: Number(item.calories),
          },
    media: mediaUrls.map((url, index) => ({
      id: `${summary.id}-media-${index}`,
      url,
      alt: `${summary.name} image ${index + 1}`,
      sortOrder: index,
    })),
    optionGroups: mapModifierGroups(item),
    combinationPricing: mapCombinationPricing(item),
    mixedNaanOptions,
    pizzaConfiguration:
      isPizzaCategory(summary.category)
        ? {
            thinCrustAvailable: isThinCrustEnabled(summary.name, item.pizzaConfiguration as { thinCrustAvailable?: boolean } | undefined),
            thinCrustPriceAdjustment: 0,
          }
        : null,
    reviewSummary: null,
    relatedItems: [],
    frequentlyOrderedWith: Array.isArray(item.frequentlyOrderedWithIds)
      ? item.frequentlyOrderedWithIds
          .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
          .map(mapSummary)
          .filter((entry) => entry.id !== summary.id && entry.isAvailable)
      : [],
    preparationNote:
      item.preparationTimeMinutes == null
        ? null
        : `Estimated preparation time: ${Number(
            item.preparationTimeMinutes,
          )} minutes.`,
    customerNotice:
      isChurChurNaanCategory(summary.category)
        ? "Choose a Half or Full platter and your sabji. Full platters include two naans, and you may choose a different second naan; the higher platter price applies."
        : isPizzaCategory(summary.category) && isThinCrustEnabled(summary.name, item.pizzaConfiguration as { thinCrustAvailable?: boolean } | undefined)
          ? "Thin crust is available only with the Medium size. It is not offered for Cheese Burst or Classic Cheese Burst pizzas."
          : null,
  };
}
