export type RecipeTab = "menu" | "production" | "history";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type InventoryItemOption = {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  averageUnitCost: number;
};

export type MenuVariantOption = {
  _id: string;
  name: string;
  price: number;
  isActive: boolean;
};

export type MenuItemOption = {
  _id: string;
  name: string;
  basePrice: number;
  variants: MenuVariantOption[];
};

export type CatalogResponse = {
  inventoryItems: InventoryItemOption[];
  menuItems: MenuItemOption[];
};

export type PopulatedInventoryItem = InventoryItemOption | string;
export type PopulatedMenuItem = Pick<MenuItemOption, "_id" | "name" | "basePrice" | "variants"> | string;

export type MenuIngredientForm = {
  inventoryItemId: string;
  quantity: number;
  wastagePercent: number;
  note: string;
};

export type ProductionIngredientForm = {
  inventoryItemId: string;
  quantityPerBaseYield: number;
  wastagePercent: number;
  note: string;
};

export type ProductionOutputForm = {
  inventoryItemId: string;
  quantityPerBaseYield: number;
  note: string;
};

export type MenuRecipeForm = {
  menuItemId: string;
  variantId: string;
  variantNameSnapshot: string;
  yieldQuantity: number;
  yieldUnit: string;
  ingredients: MenuIngredientForm[];
  preparationTimeMinutes: number;
  cookingTimeMinutes: number;
  restingTimeMinutes: number;
  cookingTemperatureC: string;
  instructions: string;
  isActive: boolean;
};

export type ProductionRecipeForm = {
  id: string;
  name: string;
  code: string;
  category: string;
  scalingMode: "ratio" | "multiplier";
  baseYieldQuantity: number;
  yieldUnit: string;
  ingredients: ProductionIngredientForm[];
  outputs: ProductionOutputForm[];
  preparationTimeMinutes: number;
  cookingTimeMinutes: number;
  restingTimeMinutes: number;
  cookingTemperatureC: string;
  shelfLifeHours: number;
  expectedWastagePercent: number;
  instructions: string;
  isActive: boolean;
};

export type MenuRecipeRecord = {
  _id: string;
  menuItemId: PopulatedMenuItem;
  variantId: string | null;
  variantNameSnapshot: string;
  yieldQuantity: number;
  yieldUnit: string;
  ingredients: Array<{
    _id?: string;
    inventoryItemId: PopulatedInventoryItem;
    quantity: number;
    wastagePercent: number;
    note: string;
  }>;
  preparationTimeMinutes: number;
  cookingTimeMinutes: number;
  restingTimeMinutes: number;
  cookingTemperatureC: number | null;
  instructions: string;
  version: number;
  isActive: boolean;
  updatedAt?: string;
};

export type ProductionRecipeRecord = {
  _id: string;
  name: string;
  code: string;
  category: string;
  scalingMode: "ratio" | "multiplier";
  baseYieldQuantity: number;
  yieldUnit: string;
  ingredients: Array<{
    _id?: string;
    inventoryItemId: PopulatedInventoryItem;
    quantityPerBaseYield: number;
    wastagePercent: number;
    note: string;
  }>;
  outputs: Array<{
    _id?: string;
    inventoryItemId: PopulatedInventoryItem;
    quantityPerBaseYield: number;
    note: string;
  }>;
  preparationTimeMinutes: number;
  cookingTimeMinutes: number;
  restingTimeMinutes: number;
  cookingTemperatureC: number | null;
  shelfLifeHours: number;
  expectedWastagePercent: number;
  instructions: string;
  version: number;
  isActive: boolean;
  updatedAt?: string;
};

export type ProductionRunRecord = {
  _id: string;
  batchNumber: string;
  recipeNameSnapshot: string;
  recipeVersion: number;
  targetYield: number;
  actualYield: number;
  yieldUnit: string;
  actualWastageQuantity: number;
  notes: string;
  expiresAt: string | null;
  status: "completed";
  createdAt: string;
};

export type ProductionDialogState = {
  id: string;
  name: string;
  baseYield: number;
  unit: string;
};

export type ProductionRunForm = {
  targetYield: number;
  actualYield: number;
  actualWastageQuantity: number;
  notes: string;
};

export function inventoryId(value: PopulatedInventoryItem): string {
  return typeof value === "string" ? value : value._id;
}

export function inventoryName(value: PopulatedInventoryItem): string {
  return typeof value === "string" ? "Inventory item" : value.name;
}

export function menuItemId(value: PopulatedMenuItem): string {
  return typeof value === "string" ? value : value._id;
}

export function menuItemName(value: PopulatedMenuItem): string {
  return typeof value === "string" ? "Menu item" : value.name;
}
