import type { Category, VariantForm } from "@/components/admin/menu/admin-menu.types";

export function categoryIdentity(categories: Category[], value: string) {
  const category = categories.find((item) => item._id === value);
  return `${category?.name ?? ""} ${category?.slug ?? ""}`.toLowerCase();
}

export function isPizzaCategory(categories: Category[], value: string) {
  return categoryIdentity(categories, value).includes("pizza");
}

export function isComboCategory(categories: Category[], value: string) {
  return categoryIdentity(categories, value).includes("combo");
}

export function isNaanCategory(categories: Category[], value: string) {
  const identity = categoryIdentity(categories, value);
  return identity.includes("chur") && identity.includes("naan");
}

export function createPizzaVariants(): VariantForm[] {
  return [
    { name: "Small 7 inch", sku: "SMALL-7", price: "", compareAtPrice: "", isDefault: true, isActive: true, sortOrder: "0" },
    { name: "Medium 9 inch", sku: "MEDIUM-9", price: "", compareAtPrice: "", isDefault: false, isActive: true, sortOrder: "1" },
    { name: "Large 12 inch", sku: "LARGE-12", price: "", compareAtPrice: "", isDefault: false, isActive: true, sortOrder: "2" },
  ];
}

export function createNaanPortionVariants(): VariantForm[] {
  return [
    { name: "Half Plate · 1 Naan", sku: "HALF", price: "", compareAtPrice: "", isDefault: true, isActive: true, sortOrder: "0" },
    { name: "Full Plate · 2 Naans", sku: "FULL", price: "", compareAtPrice: "", isDefault: false, isActive: true, sortOrder: "1" },
  ];
}
