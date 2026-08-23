"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { MenuIngredientEditor, ProductionIngredientEditor, ProductionOutputEditor } from "./recipes/IngredientEditors";
import { NumberField, SelectField, TextField } from "./recipes/form-controls";
import { ProductionRunModal } from "./recipes/ProductionRunModal";
import { MenuRecipeCards, ProductionRecipeCards, ProductionRunCards } from "./recipes/RecipeCards";
import type {
  ApiResponse,
  CatalogResponse,
  InventoryItemOption,
  MenuItemOption,
  MenuRecipeForm,
  MenuRecipeRecord,
  ProductionDialogState,
  ProductionRecipeForm,
  ProductionRecipeRecord,
  ProductionRunForm,
  ProductionRunRecord,
  RecipeTab,
} from "./recipes/types";
import { inventoryId, menuItemId } from "./recipes/types";

const emptyMenuIngredient = () => ({ inventoryItemId: "", quantity: 0, wastagePercent: 0, note: "" });
const emptyProductionIngredient = () => ({ inventoryItemId: "", quantityPerBaseYield: 0, wastagePercent: 0, note: "" });
const emptyProductionOutput = () => ({ inventoryItemId: "", quantityPerBaseYield: 0, note: "" });

const initialMenuForm: MenuRecipeForm = {
  menuItemId: "",
  variantId: "",
  variantNameSnapshot: "Base item",
  yieldQuantity: 1,
  yieldUnit: "portion",
  ingredients: [emptyMenuIngredient()],
  preparationTimeMinutes: 0,
  cookingTimeMinutes: 0,
  restingTimeMinutes: 0,
  cookingTemperatureC: "",
  instructions: "",
  isActive: true,
};

const initialProductionForm: ProductionRecipeForm = {
  id: "",
  name: "",
  code: "",
  category: "Prepared food",
  scalingMode: "ratio",
  baseYieldQuantity: 1,
  yieldUnit: "kg",
  ingredients: [emptyProductionIngredient()],
  outputs: [emptyProductionOutput()],
  preparationTimeMinutes: 0,
  cookingTimeMinutes: 0,
  restingTimeMinutes: 0,
  cookingTemperatureC: "",
  shelfLifeHours: 12,
  expectedWastagePercent: 0,
  instructions: "",
  isActive: true,
};

const initialRunForm: ProductionRunForm = {
  targetYield: 1,
  actualYield: 1,
  actualWastageQuantity: 0,
  notes: "",
};

async function readApi<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function RecipeManagementClient({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<RecipeTab>("menu");
  const [inventory, setInventory] = useState<InventoryItemOption[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [menuRecipes, setMenuRecipes] = useState<MenuRecipeRecord[]>([]);
  const [productionRecipes, setProductionRecipes] = useState<ProductionRecipeRecord[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRunRecord[]>([]);
  const [menuForm, setMenuForm] = useState<MenuRecipeForm>(initialMenuForm);
  const [productionForm, setProductionForm] = useState<ProductionRecipeForm>(initialProductionForm);
  const [productionDialog, setProductionDialog] = useState<ProductionDialogState | null>(null);
  const [runForm, setRunForm] = useState<ProductionRunForm>(initialRunForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/v1/admin/inventory/recipe-catalog", { cache: "no-store" }),
        fetch("/api/v1/admin/inventory/menu-recipes", { cache: "no-store" }),
        fetch("/api/v1/admin/inventory/production-recipes", { cache: "no-store" }),
        fetch("/api/v1/admin/inventory/production-runs", { cache: "no-store" }),
      ]);

      const [catalog, savedMenuRecipes, savedProductionRecipes, savedRuns] = await Promise.all([
        readApi<CatalogResponse>(responses[0]),
        readApi<MenuRecipeRecord[]>(responses[1]),
        readApi<ProductionRecipeRecord[]>(responses[2]),
        readApi<ProductionRunRecord[]>(responses[3]),
      ]);

      setInventory(catalog.data.inventoryItems);
      setMenuItems(catalog.data.menuItems);
      setMenuRecipes(savedMenuRecipes.data);
      setProductionRecipes(savedProductionRecipes.data);
      setProductionRuns(savedRuns.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load recipes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selectedMenuItem = menuItems.find((item) => item._id === menuForm.menuItemId);
  const menuRecipeCost = calculateMenuRecipeCost(menuForm, inventory);

  async function saveMenuRecipe() {
    const ingredients = menuForm.ingredients.filter((line) => line.inventoryItemId && line.quantity > 0);
    if (!menuForm.menuItemId || ingredients.length === 0) {
      setError("Select a menu item and add at least one valid ingredient.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/inventory/menu-recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...menuForm,
          variantId: menuForm.variantId || null,
          cookingTemperatureC: menuForm.cookingTemperatureC === "" ? null : Number(menuForm.cookingTemperatureC),
          ingredients,
        }),
      });
      const payload = await readApi<MenuRecipeRecord>(response);
      setNotice(payload.message);
      setMenuForm(initialMenuForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save menu recipe.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProductionRecipe() {
    const ingredients = productionForm.ingredients.filter((line) => line.inventoryItemId && line.quantityPerBaseYield > 0);
    const outputs = productionForm.outputs.filter((line) => line.inventoryItemId && line.quantityPerBaseYield > 0);
    if (!productionForm.name.trim() || !productionForm.code.trim() || ingredients.length === 0 || outputs.length === 0) {
      setError("Enter a recipe name/code and add at least one valid input and output.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/admin/inventory/production-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productionForm,
          id: productionForm.id || undefined,
          code: productionForm.code.toUpperCase(),
          cookingTemperatureC: productionForm.cookingTemperatureC === "" ? null : Number(productionForm.cookingTemperatureC),
          ingredients,
          outputs,
        }),
      });
      const payload = await readApi<ProductionRecipeRecord>(response);
      setNotice(payload.message);
      setProductionForm(initialProductionForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save production recipe.");
    } finally {
      setSaving(false);
    }
  }

  async function completeProductionRun() {
    if (!productionDialog) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/inventory/production-recipes/${productionDialog.id}/produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runForm),
      });
      const payload = await readApi<ProductionRunRecord>(response);
      setNotice(payload.message);
      setProductionDialog(null);
      setRunForm(initialRunForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete production.");
    } finally {
      setSaving(false);
    }
  }

  function editMenuRecipe(record: MenuRecipeRecord) {
    setTab("menu");
    setMenuForm({
      menuItemId: menuItemId(record.menuItemId),
      variantId: record.variantId ?? "",
      variantNameSnapshot: record.variantNameSnapshot || "Base item",
      yieldQuantity: record.yieldQuantity,
      yieldUnit: record.yieldUnit || "portion",
      ingredients: record.ingredients.map((line) => ({
        inventoryItemId: inventoryId(line.inventoryItemId),
        quantity: line.quantity,
        wastagePercent: line.wastagePercent || 0,
        note: line.note || "",
      })),
      preparationTimeMinutes: record.preparationTimeMinutes || 0,
      cookingTimeMinutes: record.cookingTimeMinutes || 0,
      restingTimeMinutes: record.restingTimeMinutes || 0,
      cookingTemperatureC: record.cookingTemperatureC == null ? "" : String(record.cookingTemperatureC),
      instructions: record.instructions || "",
      isActive: record.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editProductionRecipe(record: ProductionRecipeRecord) {
    setTab("production");
    setProductionForm({
      id: record._id,
      name: record.name,
      code: record.code,
      category: record.category,
      scalingMode: record.scalingMode,
      baseYieldQuantity: record.baseYieldQuantity,
      yieldUnit: record.yieldUnit,
      ingredients: record.ingredients.map((line) => ({
        inventoryItemId: inventoryId(line.inventoryItemId),
        quantityPerBaseYield: line.quantityPerBaseYield,
        wastagePercent: line.wastagePercent || 0,
        note: line.note || "",
      })),
      outputs: record.outputs.map((line) => ({
        inventoryItemId: inventoryId(line.inventoryItemId),
        quantityPerBaseYield: line.quantityPerBaseYield,
        note: line.note || "",
      })),
      preparationTimeMinutes: record.preparationTimeMinutes || 0,
      cookingTimeMinutes: record.cookingTimeMinutes || 0,
      restingTimeMinutes: record.restingTimeMinutes || 0,
      cookingTemperatureC: record.cookingTemperatureC == null ? "" : String(record.cookingTemperatureC),
      shelfLifeHours: record.shelfLifeHours || 0,
      expectedWastagePercent: record.expectedWastagePercent || 0,
      instructions: record.instructions || "",
      isActive: record.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProduction(record: ProductionRecipeRecord) {
    setRunForm({ ...initialRunForm, targetYield: record.baseYieldQuantity, actualYield: record.baseYieldQuantity });
    setProductionDialog({ id: record._id, name: record.name, baseYield: record.baseYieldQuantity, unit: record.yieldUnit });
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-3xl bg-[#173044] p-5 text-white shadow-lg sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#f0b65a]">Kitchen production & inventory</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Recipe Management</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/70">Manage pizza-size recipes, per-serving dishes and ratio-based production batches for dal, chole, gravies, sauces, dough, brownie batter and afternoon pizza bases.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p> : null}

      <nav className="flex flex-wrap gap-2" aria-label="Recipe sections">
        {([
          ["menu", "Menu recipes"],
          ["production", "Production recipes"],
          ["history", "Batch history"],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-xs font-black transition ${tab === key ? "bg-[#C8102E] text-white shadow" : "border border-[#ded3ca] bg-white text-[#173044]"}`}>{label}</button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto rounded-xl border border-[#ded3ca] bg-white px-4 py-2 text-xs font-black text-[#173044] disabled:opacity-50">{loading ? "Loading…" : "Refresh"}</button>
      </nav>

      {tab === "menu" ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]">
          <section className="min-w-0 rounded-3xl border border-[#eadfd6] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-black text-[#173044]">Menu / pizza-size recipe</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Choose a specific pizza size or use Base item for dishes without variants.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SelectField label="Menu item" value={menuForm.menuItemId} onChange={(menuItemIdValue) => setMenuForm({ ...menuForm, menuItemId: menuItemIdValue, variantId: "", variantNameSnapshot: "Base item" })} options={menuItems.map((item) => ({ value: item._id, label: item.name }))} />
              <SelectField label="Variant / pizza size" value={menuForm.variantId} onChange={(variantId) => { const variant = selectedMenuItem?.variants.find((item) => item._id === variantId); setMenuForm({ ...menuForm, variantId, variantNameSnapshot: variant?.name || "Base item" }); }} options={[{ value: "", label: "Base item" }, ...(selectedMenuItem?.variants.filter((variant) => variant.isActive).map((variant) => ({ value: variant._id, label: variant.name })) ?? [])]} />
              <NumberField label="Recipe yield" value={menuForm.yieldQuantity} min={0.001} onChange={(yieldQuantity) => setMenuForm({ ...menuForm, yieldQuantity })} />
              <TextField label="Yield unit" value={menuForm.yieldUnit} onChange={(yieldUnit) => setMenuForm({ ...menuForm, yieldUnit })} placeholder="portion / pizza / plate" />
              <NumberField label="Preparation time (min)" value={menuForm.preparationTimeMinutes} onChange={(preparationTimeMinutes) => setMenuForm({ ...menuForm, preparationTimeMinutes })} />
              <NumberField label="Cooking time (min)" value={menuForm.cookingTimeMinutes} onChange={(cookingTimeMinutes) => setMenuForm({ ...menuForm, cookingTimeMinutes })} />
              <NumberField label="Resting/proofing time (min)" value={menuForm.restingTimeMinutes} onChange={(restingTimeMinutes) => setMenuForm({ ...menuForm, restingTimeMinutes })} />
              <TextField label="Cooking temperature (°C)" value={menuForm.cookingTemperatureC} onChange={(cookingTemperatureC) => setMenuForm({ ...menuForm, cookingTemperatureC })} placeholder="e.g. 240" />
            </div>
            <MenuIngredientEditor lines={menuForm.ingredients} inventory={inventory} onChange={(ingredients) => setMenuForm({ ...menuForm, ingredients })} />
            <label className="mt-4 block text-xs font-black text-[#173044]">Kitchen instructions<textarea value={menuForm.instructions} onChange={(event) => setMenuForm({ ...menuForm, instructions: event.currentTarget.value })} className="mt-2 min-h-28 w-full rounded-xl border border-[#ded3ca] p-3 font-normal outline-none focus:border-[#C8102E]" placeholder="Assembly sequence, finishing instructions, cooking cues" /></label>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-[#fff7ef] p-4"><span className="text-xs font-black text-[#173044]">Estimated ingredient cost / yield</span><b className="text-lg text-[#C8102E]">₹{menuRecipeCost.toFixed(2)}</b></div>
            {canManage ? <button type="button" disabled={saving} onClick={() => void saveMenuRecipe()} className="mt-4 h-12 w-full rounded-xl bg-[#C8102E] text-xs font-black text-white shadow disabled:opacity-50">{saving ? "Saving…" : "Save menu recipe"}</button> : null}
          </section>
          <MenuRecipeCards rows={menuRecipes} onEdit={editMenuRecipe} />
        </div>
      ) : null}

      {tab === "production" ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]">
          <section className="min-w-0 rounded-3xl border border-[#eadfd6] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-black text-[#173044]">Scalable production recipe</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Define ingredients for a base ratio such as 1 kg. Staff can later produce 5 kg, 8.5 kg, 17 kg or any other quantity.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField label="Recipe name" value={productionForm.name} onChange={(name) => setProductionForm({ ...productionForm, name })} placeholder="Dal Makhani / Pizza Base Batch" />
              <TextField label="Code" value={productionForm.code} onChange={(code) => setProductionForm({ ...productionForm, code: code.toUpperCase() })} placeholder="DAL-MAKHANI" />
              <TextField label="Category" value={productionForm.category} onChange={(category) => setProductionForm({ ...productionForm, category })} />
              <SelectField label="Scaling mode" value={productionForm.scalingMode} onChange={(scalingMode) => setProductionForm({ ...productionForm, scalingMode: scalingMode === "multiplier" ? "multiplier" : "ratio" })} options={[{ value: "ratio", label: "Ratio / target yield" }, { value: "multiplier", label: "Batch multiplier" }]} />
              <NumberField label="Base yield" value={productionForm.baseYieldQuantity} min={0.001} onChange={(baseYieldQuantity) => setProductionForm({ ...productionForm, baseYieldQuantity })} hint="For sabji, use 1 kg as the base ratio." />
              <TextField label="Yield unit" value={productionForm.yieldUnit} onChange={(yieldUnit) => setProductionForm({ ...productionForm, yieldUnit })} placeholder="kg / litre / pieces" />
              <NumberField label="Shelf life (hours)" value={productionForm.shelfLifeHours} onChange={(shelfLifeHours) => setProductionForm({ ...productionForm, shelfLifeHours })} />
              <NumberField label="Expected wastage (%)" value={productionForm.expectedWastagePercent} onChange={(expectedWastagePercent) => setProductionForm({ ...productionForm, expectedWastagePercent })} step={0.1} />
              <NumberField label="Preparation time (min)" value={productionForm.preparationTimeMinutes} onChange={(preparationTimeMinutes) => setProductionForm({ ...productionForm, preparationTimeMinutes })} />
              <NumberField label="Cooking time (min)" value={productionForm.cookingTimeMinutes} onChange={(cookingTimeMinutes) => setProductionForm({ ...productionForm, cookingTimeMinutes })} />
              <NumberField label="Resting/proofing time (min)" value={productionForm.restingTimeMinutes} onChange={(restingTimeMinutes) => setProductionForm({ ...productionForm, restingTimeMinutes })} />
              <TextField label="Cooking temperature (°C)" value={productionForm.cookingTemperatureC} onChange={(cookingTemperatureC) => setProductionForm({ ...productionForm, cookingTemperatureC })} />
            </div>
            <ProductionIngredientEditor lines={productionForm.ingredients} inventory={inventory} onChange={(ingredients) => setProductionForm({ ...productionForm, ingredients })} />
            <ProductionOutputEditor lines={productionForm.outputs} inventory={inventory} onChange={(outputs) => setProductionForm({ ...productionForm, outputs })} />
            <label className="mt-4 block text-xs font-black text-[#173044]">Production instructions<textarea value={productionForm.instructions} onChange={(event) => setProductionForm({ ...productionForm, instructions: event.currentTarget.value })} className="mt-2 min-h-28 w-full rounded-xl border border-[#ded3ca] p-3 font-normal outline-none focus:border-[#C8102E]" placeholder="Cooking sequence, proofing, batch handling and storage instructions" /></label>
            {canManage ? <button type="button" disabled={saving} onClick={() => void saveProductionRecipe()} className="mt-4 h-12 w-full rounded-xl bg-[#C8102E] text-xs font-black text-white shadow disabled:opacity-50">{saving ? "Saving…" : productionForm.id ? "Update production recipe" : "Create production recipe"}</button> : null}
          </section>
          <ProductionRecipeCards rows={productionRecipes} onEdit={editProductionRecipe} onProduce={openProduction} />
        </div>
      ) : null}

      {tab === "history" ? <ProductionRunCards rows={productionRuns} /> : null}

      <AnimatePresence>
        {productionDialog ? <ProductionRunModal recipe={productionDialog} form={runForm} saving={saving} onChange={setRunForm} onClose={() => { if (!saving) setProductionDialog(null); }} onSubmit={() => void completeProductionRun()} /> : null}
      </AnimatePresence>
    </div>
  );
}

function calculateMenuRecipeCost(form: MenuRecipeForm, inventory: InventoryItemOption[]): number {
  const total = form.ingredients.reduce((sum, line) => {
    const item = inventory.find((candidate) => candidate._id === line.inventoryItemId);
    const wastageMultiplier = 1 + line.wastagePercent / 100;
    return sum + (item?.averageUnitCost ?? 0) * line.quantity * wastageMultiplier;
  }, 0);
  return total / Math.max(form.yieldQuantity, 0.0001);
}
