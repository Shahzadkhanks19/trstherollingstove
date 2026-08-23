import { redirect } from "next/navigation";
import { createAdminMetadata } from "@/lib/admin/metadata";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { MenuCategory } from "@/models/MenuCategory";
import { MenuItem } from "@/models/MenuItem";
import { ModifierGroup } from "@/models/ModifierGroup";
import { POSItem } from "@/models/POSItem";
import { syncExtraNaanPosItems } from "@/services/pos-extra-naan.service";
import { getSetting } from "@/services/settings.service";
import { PosWorkspace } from "@/components/admin/pos/PosWorkspace";
import {
  isAllowedNaanModifierGroup,
  isThinCrustEnabled,
  thinCrustGroupId,
  thinCrustOptionId,
} from "@/lib/menu-special-config";
import type {
  PosCatalogItem,
  PosCategory,
  PosCombinationPricing,
  PosModifierGroup,
  PosVariant,
} from "@/types/pos";

export const metadata = createAdminMetadata(
  "Point of Sale",
  "Fast counter ordering workspace for dine-in and takeaway sales.",
);

export const dynamic = "force-dynamic";

type LeanRecord = Record<string, unknown>;

function idOf(value: unknown): string {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value ?? "");
}

function mapVariants(item: LeanRecord): PosVariant[] {
  const raw = Array.isArray(item.variants) ? item.variants : [];
  const variants = raw
    .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
    .filter((entry) => entry.isActive !== false)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((entry) => ({
      id: idOf(entry._id),
      name: String(entry.name ?? "Regular"),
      price: Number(entry.price ?? 0),
      compareAtPrice: entry.compareAtPrice == null ? null : Number(entry.compareAtPrice),
      isDefault: Boolean(entry.isDefault),
      isAvailable: entry.isActive !== false,
    }));

  if (variants.length) return variants;
  return [{
    id: `${idOf(item._id)}-base`,
    name: "Regular",
    price: Number(item.basePrice ?? 0),
    compareAtPrice: item.compareAtPrice == null ? null : Number(item.compareAtPrice),
    isDefault: true,
    isAvailable: true,
  }];
}

function mapModifierGroups(item: LeanRecord, categoryName: string, categorySlug: string): PosModifierGroup[] {
  const raw = Array.isArray(item.modifierGroupIds) ? item.modifierGroupIds : [];
  const mapped = raw
    .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
    .filter((entry) => entry.isActive !== false)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((group): PosModifierGroup => {
      const options = Array.isArray(group.options) ? group.options : [];
      return {
        id: idOf(group._id),
        name: String(group.name ?? "Options"),
        selectionType: group.selectionType === "single"
          ? "single"
          : group.selectionType === "quantity"
            ? "quantity"
            : "multiple",
        required: Boolean(group.isRequired),
        minSelections: Number(group.minSelections ?? 0),
        maxSelections: Math.max(1, Number(group.maxSelections ?? 1)),
        options: options
          .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
          .filter((entry) => entry.isActive !== false && entry.isAvailable !== false)
          .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
          .map((entry) => ({
            id: idOf(entry._id),
            name: String(entry.name ?? "Option"),
            price: Number(entry.price ?? 0),
            variantPrices: Array.isArray(entry.variantPrices)
              ? entry.variantPrices
                  .filter((price): price is LeanRecord => Boolean(price && typeof price === "object"))
                  .map((price) => ({
                    variantLabel: String(price.variantLabel ?? ""),
                    price: Number(price.price ?? 0),
                  }))
                  .filter((price) => price.variantLabel)
              : [],
            isDefault: Boolean(entry.isDefault),
            isAvailable: true,
            maxQuantity: Math.max(1, Number(entry.maxQuantity ?? 1)),
          })),
      };
    });

  const isNaan = `${categoryName} ${categorySlug}`.toLowerCase().includes("chur") &&
    `${categoryName} ${categorySlug}`.toLowerCase().includes("naan");
  if (!isNaan) return mapped;

  const combinationGroupId = item.combinationPricing && typeof item.combinationPricing === "object"
    ? idOf((item.combinationPricing as LeanRecord).modifierGroupId)
    : "";
  return mapped.filter((group) =>
    group.id === combinationGroupId || isAllowedNaanModifierGroup(group.name),
  );
}

function mapCombinationPricing(item: LeanRecord): PosCombinationPricing | null {
  if (!item.combinationPricing || typeof item.combinationPricing !== "object") return null;
  const raw = item.combinationPricing as LeanRecord;
  if (raw.enabled !== true) return null;
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  return {
    enabled: true,
    modifierGroupId: raw.modifierGroupId ? idOf(raw.modifierGroupId) : null,
    entries: entries
      .filter((entry): entry is LeanRecord => Boolean(entry && typeof entry === "object"))
      .map((entry) => ({
        variantLabel: String(entry.variantLabel ?? ""),
        optionId: idOf(entry.optionId),
        optionName: String(entry.optionName ?? ""),
        price: Number(entry.price ?? 0),
      }))
      .filter((entry) => entry.variantLabel && entry.optionId),
  };
}

function isChurChurNaan(categoryName: string, categorySlug: string) {
  const identity = `${categoryName} ${categorySlug}`.toLowerCase();
  return identity.includes("chur") && identity.includes("naan");
}

export default async function PosPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login?redirect=/admin/pos");
  if (!user.permissions.includes("pos.use")) {
    redirect("/admin/dashboard?error=unauthorized");
  }

  await connectToDatabase();
  void ModifierGroup;
  await syncExtraNaanPosItems(user.id);

  const [categoryRecords, itemRecords, posItemRecords, taxSetting] = await Promise.all([
    MenuCategory.find({ isActive: true, deletedAt: null })
      .sort({ sortOrder: 1, name: 1 })
      .select("name slug")
      .lean(),
    MenuItem.find({ isActive: true, deletedAt: null })
      .populate("categoryId", "name slug")
      .populate({
        path: "modifierGroupIds",
        select: "name selectionType isRequired minSelections maxSelections options isActive sortOrder",
      })
      .sort({ sortOrder: 1, name: 1 })
      .select(
        "name slug shortDescription imageUrl categoryId basePrice compareAtPrice variants modifierGroupIds combinationPricing pizzaConfiguration isAvailable isFeatured isBestseller",
      )
      .lean(),
    POSItem.find({ isActive: true }).sort({ category: 1, sortOrder: 1, name: 1 }).lean(),
    getSetting("taxes"),
  ]);

  const categories: PosCategory[] = categoryRecords.map((category) => ({
    id: String(category._id),
    name: category.name,
    slug: category.slug,
  }));

  const naanCandidates = itemRecords.flatMap((rawItem) => {
    const candidate = rawItem as unknown as LeanRecord;
    const category = candidate.categoryId as LeanRecord | null;
    const categoryName = category?.name ? String(category.name) : "Other";
    const categorySlug = category?.slug ? String(category.slug) : "";
    const pricing = mapCombinationPricing(candidate);
    if (!isChurChurNaan(categoryName, categorySlug) || !pricing?.enabled) return [];
    return [{
      menuItemId: idOf(candidate._id),
      categoryId: category?._id ? idOf(category._id) : "uncategorized",
      name: String(candidate.name ?? "Naan"),
      prices: pricing.entries,
    }];
  });

  const items: PosCatalogItem[] = itemRecords.map((rawItem) => {
    const item = rawItem as unknown as LeanRecord;
    const category = item.categoryId as LeanRecord | null;
    const variants = mapVariants(item);
    const categoryName = category?.name ? String(category.name) : "Other";
    const categorySlug = category?.slug ? String(category.slug) : "";
    const modifierGroups = mapModifierGroups(item, categoryName, categorySlug);
    const pizzaConfiguration = item.pizzaConfiguration && typeof item.pizzaConfiguration === "object"
      ? item.pizzaConfiguration as LeanRecord
      : null;
    const isPizza = `${categoryName} ${categorySlug}`.toLowerCase().includes("pizza");
    if (isPizza && isThinCrustEnabled(String(item.name ?? ""), {
      thinCrustAvailable: pizzaConfiguration?.thinCrustAvailable !== false,
    })) {
      modifierGroups.push({
        id: thinCrustGroupId(idOf(item._id)),
        name: "Crust",
        selectionType: "single",
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [{
          id: thinCrustOptionId(idOf(item._id)),
          name: "Thin Crust",
          price: 0,
          variantPrices: [],
          isDefault: false,
          isAvailable: true,
          maxQuantity: 1,
        }],
      });
    }
    const defaultVariant = variants.find((variant) => variant.isDefault && variant.isAvailable)
      ?? variants.find((variant) => variant.isAvailable);

    return {
      id: idOf(item._id),
      name: String(item.name ?? "Menu item"),
      slug: String(item.slug ?? ""),
      shortDescription: String(item.shortDescription ?? ""),
      imageUrl: String(item.imageUrl ?? ""),
      categoryId: category?._id ? idOf(category._id) : "uncategorized",
      categoryName,
      price: Number(defaultVariant?.price ?? item.basePrice ?? 0),
      compareAtPrice: item.compareAtPrice == null ? null : Number(item.compareAtPrice),
      isAvailable: item.isAvailable !== false,
      isFeatured: item.isFeatured === true,
      isBestseller: item.isBestseller === true,
      source: "menu",
      variants,
      modifierGroups,
      combinationPricing: mapCombinationPricing(item),
      mixedNaanOptions: isChurChurNaan(categoryName, categorySlug)
        ? naanCandidates
            .filter((candidate) =>
              candidate.categoryId === (category?._id ? idOf(category._id) : "uncategorized") &&
              candidate.menuItemId !== idOf(item._id),
            )
            .map(({ menuItemId, name, prices }) => ({ menuItemId, name, prices }))
        : [],
      pizzaConfiguration: { thinCrustAvailable: pizzaConfiguration?.thinCrustAvailable !== false },
    };
  });

  const posCategories = new Map<string, PosCategory>();
  const posItems: PosCatalogItem[] = posItemRecords.map((item) => {
    const categorySlug = `pos-${item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    if (!posCategories.has(categorySlug)) {
      posCategories.set(categorySlug, { id: categorySlug, name: item.category, slug: categorySlug });
    }
    return {
      id: String(item._id),
      name: item.name,
      slug: `pos-${item.sku.toLowerCase()}`,
      shortDescription: item.description,
      imageUrl: item.imageUrl,
      categoryId: categorySlug,
      categoryName: item.category,
      price: item.sellingPrice,
      compareAtPrice: null,
      isAvailable: item.isActive,
      isFeatured: false,
      isBestseller: false,
      source: "pos",
      variants: [{ id: `${String(item._id)}-base`, name: "Regular", price: item.sellingPrice, compareAtPrice: null, isDefault: true, isAvailable: true }],
      modifierGroups: [],
      combinationPricing: null,
    };
  });

  const configuredTaxRate = Number(taxSetting.data.defaultTaxRate ?? 5);
  const defaultTaxRate = Number.isFinite(configuredTaxRate)
    ? Math.min(100, Math.max(0, configuredTaxRate))
    : 5;
  const defaultTaxMode = taxSetting.data.pricesIncludeTax === true ? "inclusive" : "exclusive";

  return (
    <PosWorkspace
      categories={[...categories, ...posCategories.values()]}
      items={[...items, ...posItems]}
      cashierName={user.name}
      defaultTaxRate={defaultTaxRate}
      defaultTaxMode={defaultTaxMode}
    />
  );
}
