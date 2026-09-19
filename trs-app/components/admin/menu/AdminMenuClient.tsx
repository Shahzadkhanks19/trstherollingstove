"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faFolderTree,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { PageHeader } from "@/components/admin/AdminPrimitives";
import { CustomActionModal } from "@/components/admin/CustomActionModal";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

import {
  emptyForm,
  type ApiResponse,
  type Category,
  type ItemForm,
  type MenuItem,
  type ModifierGroup,
  type VariantForm,
} from "@/components/admin/menu/admin-menu.types";
import { createPizzaVariants, isComboCategory as categoryIsCombo, isNaanCategory as categoryIsNaan, isPizzaCategory as categoryIsPizza } from "@/components/admin/menu/admin-menu.utils";
import { changeMenuCategory, changeVariant, createMenuItemForm, menuItemToForm } from "@/components/admin/menu/admin-menu-editor.utils";
import { buildMenuItemPayload, validateMenuItemForm } from "@/components/admin/menu/admin-menu-save.utils";
import { applyDiscountToForm, removeDiscountFromForm, validateDiscount } from "@/components/admin/menu/admin-menu-discount.utils";
import { bulkDiscountMenuItems, bulkUpdateMenuItems, deleteMenuItem, patchMenuItem } from "@/components/admin/menu/admin-menu.api";
import { AdminMenuCatalogControls } from "@/components/admin/menu/AdminMenuCatalogControls";
import { AdminMenuEditorBasics } from "@/components/admin/menu/AdminMenuEditorBasics";
import { AdminMenuEditorVariants } from "@/components/admin/menu/AdminMenuEditorVariants";
import { AdminMenuEditorRelations } from "@/components/admin/menu/AdminMenuEditorRelations";
import { AdminMenuComboBuilder } from "@/components/admin/menu/AdminMenuComboBuilder";
import { AdminMenuEditorPublishing } from "@/components/admin/menu/AdminMenuEditorPublishing";
import { AdminMenuEditorImage } from "@/components/admin/menu/AdminMenuEditorImage";
import { AdminMenuEditorShell } from "@/components/admin/menu/AdminMenuEditorShell";
import { AdminMenuBulkDiscountModal } from "@/components/admin/menu/AdminMenuBulkDiscountModal";
import { AdminMenuCatalogList } from "@/components/admin/menu/AdminMenuCatalogList";

export function AdminMenuClient({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [comboCatalogItems, setComboCatalogItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [bestseller, setBestseller] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [acting, setActing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
  const [bulkDiscountType, setBulkDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [bulkDiscountValue, setBulkDiscountValue] = useState("");
  const [bulkDiscountError, setBulkDiscountError] = useState("");
  const [itemDiscountType, setItemDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [itemDiscountValue, setItemDiscountValue] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (status === "active") params.set("isActive", "true");
    if (status === "inactive") params.set("isActive", "false");
    if (status === "available") params.set("isAvailable", "true");
    if (status === "unavailable") params.set("isAvailable", "false");
    if (featured !== "all") params.set("featured", featured);
    if (bestseller !== "all") params.set("bestseller", bestseller);
    return params.toString();
  }, [page, limit, search, categoryId, status, featured, bestseller]);

  const loadComboCatalogItems = useCallback(async () => {
    const catalogItems: MenuItem[] = [];
    let currentPage = 1;
    let catalogTotalPages = 1;

    do {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "100",
        isActive: "true",
      });
      const response = await fetch(
        `/api/v1/admin/menu/items?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ApiResponse<MenuItem[]>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to load combo menu items.");
      }

      catalogItems.push(...payload.data.filter((item) => !item.isCombo));
      catalogTotalPages = Math.max(1, payload.meta?.totalPages ?? 1);
      currentPage += 1;
    } while (currentPage <= catalogTotalPages);

    setComboCatalogItems(catalogItems);
    return catalogItems;
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/menu/items?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<MenuItem[]>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to load menu items.");
      setItems(payload.data);
      setTotal(payload.meta?.total ?? payload.data.length);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
      setSelected([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load menu items.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timer);
  }, [loadItems]);
  useRealtimeRefresh({
    events: ["menu.updated", "menu.availability_changed"],
    onEvent: () => loadItems(),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    const response = await fetch(
      "/api/v1/admin/menu/categories?includeInactive=true",
      { cache: "no-store" },
    );
    const payload = (await response.json()) as ApiResponse<Category[]>;
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to load menu categories.");
    }

    let loadedCategories = payload.data;

    const activeComboCategoryExists = loadedCategories.some(
      (category) =>
        category.isActive &&
        (category.slug === "combos" ||
          category.name.trim().toLowerCase() === "combos"),
    );

    if (!activeComboCategoryExists && canCreate) {
      const seedResponse = await fetch("/api/v1/admin/menu/categories/seed", {
        method: "POST",
      });
      const seedPayload = (await seedResponse.json()) as ApiResponse<unknown>;
      if (!seedResponse.ok || !seedPayload.success) {
        throw new Error(
          seedPayload.message ||
            "Unable to install the default TRS categories.",
        );
      }

      const reloadResponse = await fetch(
        "/api/v1/admin/menu/categories?includeInactive=true",
        { cache: "no-store" },
      );
      const reloadPayload = (await reloadResponse.json()) as ApiResponse<
        Category[]
      >;
      if (!reloadResponse.ok || !reloadPayload.success) {
        throw new Error(
          reloadPayload.message || "Unable to reload menu categories.",
        );
      }
      loadedCategories = reloadPayload.data;
    }

    setCategories(loadedCategories);
    return loadedCategories;
  }, [canCreate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        loadCategories(),
        loadComboCatalogItems(),
        fetch("/api/v1/admin/menu/modifier-groups", { cache: "no-store" }).then(
          async (response) => {
            const payload = (await response.json()) as ApiResponse<
              ModifierGroup[]
            >;
            if (!response.ok || !payload.success)
              throw new Error(
                payload.message || "Unable to load add-on groups.",
              );
            setModifierGroups(payload.data);
          },
        ),
      ]).catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load menu setup.",
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories, loadComboCatalogItems]);

  async function openCreate() {
    setEditingId(null); setFormError(""); setItemDiscountType("percentage"); setItemDiscountValue("");
    try {
      const [availableCategories] = await Promise.all([categories.length ? Promise.resolve(categories) : loadCategories(), loadComboCatalogItems()]);
      setForm(createMenuItemForm(availableCategories));
      setEditorOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load menu categories.");
    }
  }

  async function openEdit(itemId: string) {
    setActing(true); setFormError(""); setItemDiscountType("percentage"); setItemDiscountValue("");
    try {
      await loadComboCatalogItems();
      const response = await fetch(`/api/v1/admin/menu/items/${itemId}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<MenuItem>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load menu item.");
      setEditingId(payload.data._id);
      setForm(menuItemToForm(payload.data, categories));
      setEditorOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load menu item.");
    } finally { setActing(false); }
  }

  async function uploadItemImage(file: File) {
    setUploadingImage(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/v1/admin/uploads/menu", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as ApiResponse<{ url: string }>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Image upload failed.");
      setForm((current) => ({ ...current, imageUrl: payload.data.url }));
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function handleCategoryChange(value: string) {
    setForm((current) => changeMenuCategory(current, value, categories, modifierGroups));
  }

  function applyPizzaVariantPreset() {
    setForm((current) => ({
      ...current,
      basePrice: "",
      variants: createPizzaVariants(),
    }));
  }

  function updateVariant(index: number, updates: Partial<VariantForm>) {
    setForm((current) => changeVariant(current, index, updates));
  }

  const isPizzaCategory = categoryIsPizza(categories, form.categoryId);
  const isNaanCategory = categoryIsNaan(categories, form.categoryId);
  const isComboCategory = categoryIsCombo(categories, form.categoryId);
  const hasRequiredVariants = isPizzaCategory || isNaanCategory;

  const combinationGroup = modifierGroups.find(
    (group) => group._id === form.combinationPricing.modifierGroupId,
  );

  function selectCombinationGroup(groupId: string) {
    const group = modifierGroups.find((entry) => entry._id === groupId);
    const entries = group
      ? form.variants.flatMap((variant) =>
          group.options
            .filter(
              (option) =>
                option._id && option.isActive && option.isAvailable !== false,
            )
            .map((option) => {
              const existing = form.combinationPricing.entries.find(
                (entry) =>
                  entry.variantLabel === variant.name &&
                  entry.optionId === option._id,
              );
              return (
                existing ?? {
                  variantLabel: variant.name,
                  optionId: option._id as string,
                  optionName: option.name,
                  price: "",
                }
              );
            }),
        )
      : [];
    setForm((current) => ({
      ...current,
      modifierGroupIds:
        groupId && !current.modifierGroupIds.includes(groupId)
          ? [...current.modifierGroupIds, groupId]
          : current.modifierGroupIds,
      combinationPricing: {
        enabled: Boolean(groupId),
        modifierGroupId: groupId,
        entries,
      },
    }));
  }

  function updateCombinationPrice(
    variantLabel: string,
    optionId: string,
    price: string,
  ) {
    setForm((current) => ({
      ...current,
      combinationPricing: {
        ...current.combinationPricing,
        entries: current.combinationPricing.entries.map((entry) =>
          entry.variantLabel === variantLabel && entry.optionId === optionId
            ? { ...entry, price }
            : entry,
        ),
      },
    }));
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    const context = { form, items, modifierGroups, editingId, isPizzaCategory, isNaanCategory, isComboCategory, hasRequiredVariants, combinationGroup };
    const validationError = validateMenuItemForm(context);
    if (validationError) { setFormError(validationError); return; }
    setActing(true);
    try {
      const response = await fetch(editingId ? `/api/v1/admin/menu/items/${editingId}` : "/api/v1/admin/menu/items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMenuItemPayload(context)),
      });
      const payload = (await response.json()) as ApiResponse<MenuItem>;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to save menu item.");
      setEditorOpen(false);
      setNotice(editingId ? "Menu item updated." : "Menu item created.");
      await loadItems();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Unable to save menu item.");
    } finally { setActing(false); }
  }

  async function patchItem(item: MenuItem, updates: Partial<MenuItem>) {
    setActing(true); setError("");
    try {
      const payload = await patchMenuItem(item._id, updates);
      setNotice(payload.message); await loadItems();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update menu item.");
    } finally { setActing(false); }
  }

  async function bulkAction(action: string) {
    if (!selected.length) return;
    setActing(true); setError("");
    try {
      const payload = await bulkUpdateMenuItems(selected, action);
      setNotice(payload.message); await loadItems();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update selected items.");
    } finally { setActing(false); }
  }

  async function applyBulkDiscount(action: "apply_discount" | "remove_discount") {
    if (!selected.length) return;
    const numericValue = Number(bulkDiscountValue);
    if (action === "apply_discount") {
      const validationError = validateDiscount(bulkDiscountType, bulkDiscountValue);
      if (validationError) { setBulkDiscountError(validationError); return; }
    }
    setActing(true); setError(""); setBulkDiscountError("");
    try {
      const payload = await bulkDiscountMenuItems(selected, action, bulkDiscountType, numericValue);
      setNotice(payload.message); setBulkDiscountOpen(false); setBulkDiscountValue(""); await loadItems();
    } catch (requestError) {
      setBulkDiscountError(requestError instanceof Error ? requestError.message : "Unable to update discounts.");
    } finally { setActing(false); }
  }

  function applyDiscountToCurrentItem() {
    const validationError = validateDiscount(itemDiscountType, itemDiscountValue);
    if (validationError) { setFormError(validationError); return; }
    setForm((current) => applyDiscountToForm(current, itemDiscountType, itemDiscountValue));
    setFormError("");
  }

  function removeDiscountFromCurrentItem() {
    setForm(removeDiscountFromForm);
    setItemDiscountValue("");
    setFormError("");
  }

  async function deleteItem() {
    if (!itemToDelete) return;
    setActing(true);
    try {
      const payload = await deleteMenuItem(itemToDelete._id);
      setNotice(payload.message); setItemToDelete(null); await loadItems();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete menu item.");
    } finally { setActing(false); }
  }

  const comboCalculation = (() => {
    if (!isComboCategory) return { originalPrice: 0, savings: 0, discount: 0 };
    const originalPrice = form.comboComponents.reduce((sum, entry) => {
      const item = comboCatalogItems.find(
        (candidate) => candidate._id === entry.menuItemId,
      );
      if (!item) return sum;
      const variant = item.variants.find(
        (candidate) => candidate._id === entry.variantId,
      );
      const price = variant?.price ?? item.basePrice;
      return sum + price * Math.max(0, Number(entry.quantity) || 0);
    }, 0);
    const sellingPrice = Number(form.basePrice) || 0;
    const savings = Math.max(0, originalPrice - sellingPrice);
    return {
      originalPrice,
      savings,
      discount: originalPrice > 0 ? (savings / originalPrice) * 100 : 0,
    };
  })();

  return (
    <div className="min-w-0 overflow-x-hidden">
      <PageHeader
        eyebrow="Catalog operations"
        title="Menu Management"
        description="Manage pricing, availability, merchandising, service modes and catalog visibility from one workspace."
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Link
              href="/admin/menu/categories"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] bg-white px-4 text-xs font-black text-[#122b3c]"
            >
              <FontAwesomeIcon icon={faFolderTree} /> Categories
            </Link>
            <Link
              href="/admin/menu/modifier-groups"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#e5d9cf] bg-white px-4 text-xs font-black text-[#122b3c]"
            >
              <FontAwesomeIcon icon={faPlus} /> Add-ons
            </Link>
            {canCreate && (
              <button
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C8102E] px-4 sm:px-5 text-xs font-black text-white shadow-[0_10px_24px_rgba(200,16,46,.24)] transition hover:-translate-y-0.5"
              >
                <FontAwesomeIcon icon={faPlus} /> Add menu item
              </button>
            )}
          </div>
        }
      />

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <span>
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            {notice}
          </span>
          <button onClick={() => setNotice("")}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <section className="min-w-0 overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[#e8ddd3] bg-[#fffdf9] shadow-[0_10px_32px_rgba(30,35,40,.05)]">
        <AdminMenuCatalogControls
          categories={categories}
          searchInput={searchInput}
          showFilters={showFilters}
          categoryId={categoryId}
          status={status}
          featured={featured}
          bestseller={bestseller}
          loading={loading}
          selectedCount={selected.length}
          canUpdate={canUpdate}
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          itemCount={items.length}
          onSearchInputChange={setSearchInput}
          onToggleFilters={() => setShowFilters((value) => !value)}
          onCategoryChange={(value) => { setCategoryId(value); setPage(1); }}
          onStatusChange={(value) => { setStatus(value); setPage(1); }}
          onFeaturedChange={(value) => { setFeatured(value); setPage(1); }}
          onBestsellerChange={(value) => { setBestseller(value); setPage(1); }}
          onRefresh={() => void loadItems()}
          onBulkAction={(action) => {
            if (action === "remove_discount") void applyBulkDiscount(action);
            else void bulkAction(action);
          }}
          onOpenBulkDiscount={() => { setBulkDiscountError(""); setBulkDiscountOpen(true); }}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
        />

        <AdminMenuCatalogList
          items={items}
          loading={loading}
          selected={selected}
          canUpdate={canUpdate}
          canDelete={canDelete}
          acting={acting}
          onToggleSelected={(id) =>
            setSelected((current) =>
              current.includes(id)
                ? current.filter((selectedId) => selectedId !== id)
                : [...current, id],
            )
          }
          onToggleAll={() =>
            setSelected(
              items.length > 0 && items.every((item) => selected.includes(item._id))
                ? []
                : items.map((item) => item._id),
            )
          }
          onEdit={(id) => void openEdit(id)}
          onDelete={setItemToDelete}
          onToggleAvailability={(item) =>
            void patchItem(item, { isAvailable: !item.isAvailable })
          }
        />


      </section>

      <AdminMenuEditorShell
        open={editorOpen}
        editing={Boolean(editingId)}
        acting={acting}
        error={formError}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveItem}
      >
                  <AdminMenuEditorImage
                    imageUrl={form.imageUrl}
                    inputRef={imageInputRef}
                    uploading={uploadingImage}
                    onUpload={(file) => void uploadItemImage(file)}
                    onRemove={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                  />

                  <AdminMenuEditorBasics
                    form={form}
                    setForm={setForm}
                    categories={categories}
                    isComboCategory={isComboCategory}
                    hasRequiredVariants={hasRequiredVariants}
                    itemDiscountType={itemDiscountType}
                    itemDiscountValue={itemDiscountValue}
                    onCategoryChange={handleCategoryChange}
                    onDiscountTypeChange={setItemDiscountType}
                    onDiscountValueChange={setItemDiscountValue}
                    onApplyDiscount={applyDiscountToCurrentItem}
                    onRemoveDiscount={removeDiscountFromCurrentItem}
                  />

                  <AdminMenuEditorVariants
                    form={form}
                    setForm={setForm}
                    isPizzaCategory={isPizzaCategory}
                    isNaanCategory={isNaanCategory}
                    hasRequiredVariants={hasRequiredVariants}
                    modifierGroups={modifierGroups}
                    combinationGroup={combinationGroup}
                    onResetPizza={applyPizzaVariantPreset}
                    onUpdateVariant={updateVariant}
                    onSelectCombinationGroup={selectCombinationGroup}
                    onUpdateCombinationPrice={updateCombinationPrice}
                  />

                  <AdminMenuEditorRelations
                    form={form}
                    setForm={setForm}
                    modifierGroups={modifierGroups}
                    items={items}
                    editingId={editingId}
                    isNaanCategory={isNaanCategory}
                  />

                  {isComboCategory && (
                    <AdminMenuComboBuilder
                      form={form}
                      setForm={setForm}
                      items={comboCatalogItems}
                      editingId={editingId}
                      calculation={comboCalculation}
                    />
                  )}

                  <AdminMenuEditorPublishing
                    form={form}
                    setForm={setForm}
                    isComboCategory={isComboCategory}
                  />

      </AdminMenuEditorShell>
      <style jsx global>{`
        .field {
          height: 44px;
          width: 100%;
          border: 1px solid #e5d9cf;
          border-radius: 14px;
          background: #fff;
          padding-left: 12px;
          padding-right: 12px;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }
        .field.price-field {
          padding-left: 38px;
        }
        .field:focus {
          border-color: #c8102e;
          box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.08);
        }
      `}</style>
      <AdminMenuBulkDiscountModal
        open={bulkDiscountOpen}
        acting={acting}
        selectedCount={selected.length}
        type={bulkDiscountType}
        value={bulkDiscountValue}
        error={bulkDiscountError}
        onClose={() => setBulkDiscountOpen(false)}
        onTypeChange={(value) => {
          setBulkDiscountType(value);
          setBulkDiscountError("");
        }}
        onValueChange={(value) => {
          setBulkDiscountValue(value);
          setBulkDiscountError("");
        }}
        onApply={() => void applyBulkDiscount("apply_discount")}
      />

      <CustomActionModal
        open={Boolean(itemToDelete)}
        title="Delete menu item?"
        description={`${itemToDelete?.name ?? "This menu item"} will be removed from the active catalog. This action cannot be undone.`}
        confirmLabel="Delete menu item"
        tone="danger"
        loading={acting}
        onClose={() => {
          if (!acting) setItemToDelete(null);
        }}
        onConfirm={deleteItem}
      />
    </div>
  );
}

