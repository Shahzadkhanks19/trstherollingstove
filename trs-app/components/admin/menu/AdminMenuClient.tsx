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
import { localDateTimeInputValue } from "@/lib/validation/dateTime";

import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  isAllowedNaanModifierGroup,
  isThinCrustExcludedPizza,
} from "@/lib/menu-special-config";

import {
  emptyForm,
  type ApiResponse,
  type Category,
  type ItemForm,
  type MenuItem,
  type ModifierGroup,
  type VariantForm,
} from "@/components/admin/menu/admin-menu.types";
import { createNaanPortionVariants, createPizzaVariants, isComboCategory as categoryIsCombo, isNaanCategory as categoryIsNaan, isPizzaCategory as categoryIsPizza } from "@/components/admin/menu/admin-menu.utils";
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
    setEditingId(null);
    setFormError("");
    setItemDiscountType("percentage");
    setItemDiscountValue("");

    try {
      const [availableCategories] = await Promise.all([
        categories.length > 0 ? Promise.resolve(categories) : loadCategories(),
        loadComboCatalogItems(),
      ]);
      const defaultCategory = availableCategories.find(
        (category) => category.isActive,
      );
      const defaultIsPizza =
        `${defaultCategory?.name ?? ""} ${defaultCategory?.slug ?? ""}`
          .toLowerCase()
          .includes("pizza");
      setForm({
        ...emptyForm,
        categoryId: defaultCategory?._id ?? "",
        variants: defaultIsPizza
          ? createPizzaVariants()
          : defaultCategory &&
              `${defaultCategory.name} ${defaultCategory.slug}`
                .toLowerCase()
                .includes("chur")
            ? createNaanPortionVariants()
            : [],
        pizzaConfiguration: {
          thinCrustAvailable: true,
          thinCrustPriceAdjustment: "0",
        },
      });
      setEditorOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load menu categories.",
      );
    }
  }

  async function openEdit(itemId: string) {
    setActing(true);
    setFormError("");
    setItemDiscountType("percentage");
    setItemDiscountValue("");
    try {
      await loadComboCatalogItems();
      const response = await fetch(`/api/v1/admin/menu/items/${itemId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<MenuItem>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to load menu item.");
      const item = payload.data;
      const itemCategoryId =
        typeof item.categoryId === "string"
          ? item.categoryId
          : item.categoryId._id;
      const itemCategory = categories.find(
        (category) => category._id === itemCategoryId,
      );
      const itemIdentity =
        `${itemCategory?.name ?? ""} ${itemCategory?.slug ?? ""}`.toLowerCase();
      const itemIsPizza = itemIdentity.includes("pizza");
      const itemIsNaan =
        itemIdentity.includes("chur") && itemIdentity.includes("naan");
      setEditingId(item._id);
      setForm({
        name: item.name,
        slug: item.slug,
        categoryId: itemCategoryId,
        shortDescription: item.shortDescription ?? "",
        description: item.description ?? "",
        imageUrl: item.imageUrl ?? "",
        basePrice: String(item.basePrice),
        compareAtPrice:
          item.compareAtPrice == null ? "" : String(item.compareAtPrice),
        variants:
          (itemIsPizza || itemIsNaan) && (item.variants ?? []).length === 0
            ? itemIsPizza
              ? createPizzaVariants()
              : createNaanPortionVariants()
            : (item.variants ?? []).map((variant, index) => ({
                name: variant.name,
                sku: variant.sku ?? "",
                price: String(variant.price),
                compareAtPrice:
                  variant.compareAtPrice == null
                    ? ""
                    : String(variant.compareAtPrice),
                isDefault: variant.isDefault ?? index === 0,
                isActive: variant.isActive ?? true,
                sortOrder: String(variant.sortOrder ?? index),
              })),
        modifierGroupIds: (item.modifierGroupIds ?? []).map((group) =>
          typeof group === "string" ? group : group._id,
        ),
        frequentlyOrderedWithIds: (item.frequentlyOrderedWithIds ?? []).flatMap(
          (related) => {
            if (!related) return [];
            if (typeof related === "string") return [related];
            return related.isActive !== false ? [related._id] : [];
          },
        ),
        combinationPricing: {
          enabled: item.combinationPricing?.enabled ?? false,
          modifierGroupId: item.combinationPricing?.modifierGroupId ?? "",
          entries: (item.combinationPricing?.entries ?? []).map((entry) => ({
            ...entry,
            price: String(entry.price),
          })),
        },
        pizzaConfiguration: {
          thinCrustAvailable:
            item.pizzaConfiguration?.thinCrustAvailable ??
            !isThinCrustExcludedPizza(item.name),
          thinCrustPriceAdjustment: String(
            item.pizzaConfiguration?.thinCrustPriceAdjustment ?? 0,
          ),
        },
        spiceLevel: item.spiceLevel,
        preparationTimeMinutes: String(item.preparationTimeMinutes),
        tags: item.tags.join(", "),
        allergens: item.allergens.join(", "),
        availableForDineIn: item.availableForDineIn,
        availableForTakeaway: item.availableForTakeaway,
        isAvailable: item.isAvailable,
        isActive: item.isActive,
        isFeatured: item.isFeatured,
        isBestseller: item.isBestseller,
        isCombo: item.isCombo ?? false,
        comboComponents: (item.comboComponents ?? []).map((entry) => ({
          menuItemId:
            typeof entry.menuItemId === "string"
              ? entry.menuItemId
              : entry.menuItemId._id,
          variantId: entry.variantId ?? "",
          quantity: String(entry.quantity),
        })),
        comboOfferType: item.comboOfferType ?? "permanent",
        comboOfferStartsAt: item.comboOfferStartsAt
          ? localDateTimeInputValue(new Date(item.comboOfferStartsAt))
          : "",
        comboOfferExpiresAt: item.comboOfferExpiresAt
          ? localDateTimeInputValue(new Date(item.comboOfferExpiresAt))
          : "",
        publishComboOnMenuPage: item.publishComboOnMenuPage ?? true,
        publishComboOnOffersPage: item.publishComboOnOffersPage ?? false,
        comboOffersPageSection: item.comboOffersPageSection ?? "permanent",
        eligibleTierKeys: item.eligibleTierKeys?.length
          ? item.eligibleTierKeys
          : ["bronze", "silver", "gold", "platinum"],
        isTodaysSpecialOffer: item.isTodaysSpecialOffer ?? false,
        todaysSpecialOfferStartsAt: item.todaysSpecialOfferStartsAt
          ? localDateTimeInputValue(new Date(item.todaysSpecialOfferStartsAt))
          : "",
        trackInventory: item.trackInventory,
        sortOrder: String(item.sortOrder),
      });
      setEditorOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load menu item.",
      );
    } finally {
      setActing(false);
    }
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
    const pizzaSelected = categoryIsPizza(categories, value);
    const naanSelected = categoryIsNaan(categories, value);
    const comboSelected = categoryIsCombo(categories, value);
    setForm((current) => ({
      ...current,
      categoryId: value,
      basePrice: pizzaSelected || naanSelected ? "" : current.basePrice,
      isCombo: comboSelected,
      comboComponents: comboSelected
        ? current.comboComponents.length >= 2
          ? current.comboComponents
          : [
              { menuItemId: "", variantId: "", quantity: "1" },
              { menuItemId: "", variantId: "", quantity: "1" },
            ]
        : [],
      variants: pizzaSelected
        ? current.variants.length > 0
          ? current.variants
          : createPizzaVariants()
        : naanSelected
          ? current.variants.length > 0
            ? current.variants
            : createNaanPortionVariants()
          : [],
      combinationPricing: naanSelected
        ? current.combinationPricing
        : { enabled: false, modifierGroupId: "", entries: [] },
      modifierGroupIds: naanSelected
        ? current.modifierGroupIds.filter((groupId) => {
            const group = modifierGroups.find((entry) => entry._id === groupId);
            return Boolean(
              group &&
              isAllowedNaanModifierGroup(group.name, group.internalName),
            );
          })
        : current.modifierGroupIds,
      pizzaConfiguration: pizzaSelected
        ? current.pizzaConfiguration
        : { thinCrustAvailable: false, thinCrustPriceAdjustment: "0" },
    }));
  }

  function applyPizzaVariantPreset() {
    setForm((current) => ({
      ...current,
      basePrice: "",
      variants: createPizzaVariants(),
    }));
  }

  function updateVariant(index: number, updates: Partial<VariantForm>) {
    setForm((current) => {
      const previousName = current.variants[index]?.name ?? "";
      const nextVariants = current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) {
          if (updates.isDefault) return { ...variant, isDefault: false };
          return variant;
        }
        return { ...variant, ...updates };
      });
      const nextName = nextVariants[index]?.name ?? previousName;
      return {
        ...current,
        variants: nextVariants,
        combinationPricing: {
          ...current.combinationPricing,
          entries: current.combinationPricing.entries.map((entry) =>
            entry.variantLabel === previousName
              ? { ...entry, variantLabel: nextName }
              : entry,
          ),
        },
      };
    });
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
    const activeVariants = hasRequiredVariants
      ? form.variants.filter((variant) => variant.name.trim())
      : [];
    const invalidVariant = activeVariants.some(
      (variant) => variant.price === "" || Number(variant.price) < 0,
    );
    if (!form.name.trim() || !form.categoryId) {
      setFormError("Item name and category are required.");
      return;
    }
    if (isPizzaCategory && (activeVariants.length !== 3 || invalidVariant)) {
      setFormError(
        "Enter a valid price for Small 7 inch, Medium 9 inch and Large 12 inch.",
      );
      return;
    }
    if (isNaanCategory && activeVariants.length !== 2) {
      setFormError(
        "Half Plate and Full Plate portions are required for this naan.",
      );
      return;
    }
    if (isNaanCategory) {
      const expectedEntries =
        activeVariants.length *
        (combinationGroup?.options.filter(
          (option) =>
            option._id && option.isActive && option.isAvailable !== false,
        ).length ?? 0);
      const validEntries = form.combinationPricing.entries.filter(
        (entry) => entry.price !== "" && Number(entry.price) >= 0,
      );
      if (
        !form.combinationPricing.enabled ||
        !combinationGroup ||
        expectedEntries === 0 ||
        validEntries.length !== expectedEntries
      ) {
        setFormError(
          "Select the second-sabji group and enter every Half/Full combination price.",
        );
        return;
      }
    }
    if (
      !hasRequiredVariants &&
      (form.basePrice === "" || Number(form.basePrice) < 0)
    ) {
      setFormError("Selling price is required.");
      return;
    }
    if (
      !isComboCategory &&
      !hasRequiredVariants &&
      form.compareAtPrice !== "" &&
      Number(form.compareAtPrice) <= Number(form.basePrice)
    ) {
      setFormError(
        "Original price must be greater than the discounted selling price.",
      );
      return;
    }
    if (
      !isComboCategory &&
      hasRequiredVariants &&
      activeVariants.some(
        (variant) =>
          variant.compareAtPrice !== "" &&
          Number(variant.compareAtPrice) <= Number(variant.price),
      )
    ) {
      setFormError(
        "Each variant original price must be greater than its discounted selling price.",
      );
      return;
    }
    if (
      form.isCombo &&
      form.comboOfferType === "limited" &&
      (!form.comboOfferStartsAt || !form.comboOfferExpiresAt)
    ) {
      setFormError("Limited-time combos require start and expiry dates.");
      return;
    }
    if (
      form.isCombo &&
      form.publishComboOnOffersPage &&
      form.comboOffersPageSection === "todays" &&
      !form.comboOfferStartsAt
    ) {
      setFormError("Select when the 24-hour Today’s Hot Offer should start.");
      return;
    }
    if (form.isTodaysSpecialOffer && !form.todaysSpecialOfferStartsAt) {
      setFormError("Select when the 24-hour special offer should start.");
      return;
    }
    setActing(true);
    try {
      const normalizedVariants = activeVariants.map((variant, index) => {
        const variantName = variant.name.trim();
        const combinationPrices = isNaanCategory
          ? form.combinationPricing.entries
              .filter(
                (entry) =>
                  entry.variantLabel === variant.name &&
                  entry.price !== "" &&
                  Number(entry.price) >= 0,
              )
              .map((entry) => Number(entry.price))
          : [];
        const derivedNaanFallbackPrice = combinationPrices.length
          ? Math.min(...combinationPrices)
          : 0;

        return {
          name: variantName,
          sku: variant.sku.trim(),
          price: isNaanCategory
            ? derivedNaanFallbackPrice
            : Number(variant.price),
          compareAtPrice:
            variant.compareAtPrice === ""
              ? null
              : Number(variant.compareAtPrice),
          isDefault:
            variant.isDefault ||
            (!activeVariants.some((item) => item.isDefault) && index === 0),
          isActive: variant.isActive,
          sortOrder: Number(variant.sortOrder || index),
        };
      });
      const defaultVariant =
        normalizedVariants.find((variant) => variant.isDefault) ??
        normalizedVariants[0];
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        basePrice:
          hasRequiredVariants && defaultVariant
            ? defaultVariant.price
            : Number(form.basePrice),
        compareAtPrice:
          isComboCategory || hasRequiredVariants || form.compareAtPrice === ""
            ? null
            : Number(form.compareAtPrice),
        spiceLevel: form.spiceLevel,
        preparationTimeMinutes: Number(form.preparationTimeMinutes || 15),
        tags: form.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        allergens: form.allergens
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        availableForDineIn: form.availableForDineIn,
        availableForTakeaway: form.availableForTakeaway,
        isAvailable: form.isAvailable,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        isBestseller: form.isBestseller,
        isCombo: isComboCategory,
        comboComponents: isComboCategory
          ? form.comboComponents.map((entry) => ({
              menuItemId: entry.menuItemId,
              variantId: entry.variantId || null,
              quantity: Number(entry.quantity),
            }))
          : [],
        comboOfferType: form.comboOfferType,
        comboOfferStartsAt:
          form.isCombo && form.comboOfferStartsAt
            ? new Date(form.comboOfferStartsAt).toISOString()
            : null,
        comboOfferExpiresAt:
          form.isCombo &&
          form.comboOfferType === "limited" &&
          form.comboOfferExpiresAt
            ? new Date(form.comboOfferExpiresAt).toISOString()
            : null,
        publishComboOnMenuPage: form.isCombo
          ? form.publishComboOnMenuPage
          : true,
        publishComboOnOffersPage: form.isCombo
          ? form.publishComboOnOffersPage
          : false,
        comboOffersPageSection: form.comboOffersPageSection,
        eligibleTierKeys: form.eligibleTierKeys,
        isTodaysSpecialOffer: form.isTodaysSpecialOffer,
        todaysSpecialOfferStartsAt:
          form.isTodaysSpecialOffer && form.todaysSpecialOfferStartsAt
            ? new Date(form.todaysSpecialOfferStartsAt).toISOString()
            : null,
        trackInventory: form.trackInventory,
        sortOrder: Number(form.sortOrder || 0),
        galleryUrls: [],
        variants: normalizedVariants,
        combinationPricing: isNaanCategory
          ? {
              enabled: true,
              modifierGroupId: form.combinationPricing.modifierGroupId,
              entries: form.combinationPricing.entries.map((entry) => ({
                ...entry,
                price: Number(entry.price),
              })),
            }
          : { enabled: false, modifierGroupId: null, entries: [] },
        pizzaConfiguration: isPizzaCategory
          ? {
              thinCrustAvailable:
                !isThinCrustExcludedPizza(form.name) &&
                form.pizzaConfiguration.thinCrustAvailable,
              thinCrustPriceAdjustment: 0,
            }
          : { thinCrustAvailable: false, thinCrustPriceAdjustment: 0 },
        modifierGroupIds: isNaanCategory
          ? form.modifierGroupIds.filter((groupId) => {
              const group = modifierGroups.find(
                (entry) => entry._id === groupId,
              );
              return Boolean(
                group &&
                isAllowedNaanModifierGroup(group.name, group.internalName),
              );
            })
          : form.modifierGroupIds,
        frequentlyOrderedWithIds: form.frequentlyOrderedWithIds.filter(
          (id) =>
            id !== editingId &&
            items.some(
              (candidate) => candidate._id === id && candidate.isActive,
            ),
        ),
        taxClassId: null,
        calories: null,
        availabilityWindows: [],
      };

      const response = await fetch(
        editingId
          ? `/api/v1/admin/menu/items/${editingId}`
          : "/api/v1/admin/menu/items",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as ApiResponse<MenuItem>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to save menu item.");
      setEditorOpen(false);
      setNotice(editingId ? "Menu item updated." : "Menu item created.");
      await loadItems();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save menu item.",
      );
    } finally {
      setActing(false);
    }
  }

  async function patchItem(item: MenuItem, updates: Partial<MenuItem>) {
    setActing(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/menu/items/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = (await response.json()) as ApiResponse<MenuItem>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to update menu item.");
      setNotice(payload.message);
      await loadItems();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update menu item.",
      );
    } finally {
      setActing(false);
    }
  }

  async function bulkAction(action: string) {
    if (!selected.length) return;
    setActing(true);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/menu/items/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selected, action }),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to update selected items.");
      setNotice(payload.message);
      await loadItems();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update selected items.",
      );
    } finally {
      setActing(false);
    }
  }

  async function applyBulkDiscount(
    action: "apply_discount" | "remove_discount",
  ) {
    if (!selected.length) return;

    const numericValue = Number(bulkDiscountValue);
    if (action === "apply_discount") {
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        setBulkDiscountError("Enter a discount greater than zero.");
        return;
      }
      if (bulkDiscountType === "percentage" && numericValue >= 100) {
        setBulkDiscountError("Percentage discount must be less than 100%.");
        return;
      }
    }

    setActing(true);
    setError("");
    setBulkDiscountError("");
    try {
      const response = await fetch("/api/v1/admin/menu/items/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selected,
          action,
          ...(action === "apply_discount"
            ? { discountType: bulkDiscountType, discountValue: numericValue }
            : {}),
        }),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to update discounts.");
      }
      setNotice(payload.message);
      setBulkDiscountOpen(false);
      setBulkDiscountValue("");
      await loadItems();
    } catch (requestError) {
      setBulkDiscountError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update discounts.",
      );
    } finally {
      setActing(false);
    }
  }

  function applyDiscountToCurrentItem() {
    const discountValue = Number(itemDiscountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError("Enter a discount greater than zero.");
      return;
    }
    if (itemDiscountType === "percentage" && discountValue >= 100) {
      setFormError("Percentage discount must be less than 100%.");
      return;
    }

    const discountedPrice = (originalPrice: number) => {
      const result =
        itemDiscountType === "percentage"
          ? originalPrice * (1 - discountValue / 100)
          : originalPrice - discountValue;
      return Math.round((result + Number.EPSILON) * 100) / 100;
    };

    setForm((current) => {
      if (current.variants.length > 0) {
        const variants = current.variants.map((variant) => {
          const originalPrice = Number(variant.compareAtPrice || variant.price);
          const nextPrice = discountedPrice(originalPrice);
          if (nextPrice <= 0 || nextPrice >= originalPrice) return variant;
          return {
            ...variant,
            price: String(nextPrice),
            compareAtPrice: String(originalPrice),
          };
        });
        const defaultVariant =
          variants.find((variant) => variant.isDefault) ?? variants[0];
        return {
          ...current,
          variants,
          basePrice: defaultVariant?.price ?? current.basePrice,
          compareAtPrice:
            defaultVariant?.compareAtPrice ?? current.compareAtPrice,
        };
      }

      const originalPrice = Number(current.compareAtPrice || current.basePrice);
      const nextPrice = discountedPrice(originalPrice);
      if (nextPrice <= 0 || nextPrice >= originalPrice) return current;
      return {
        ...current,
        basePrice: String(nextPrice),
        compareAtPrice: String(originalPrice),
      };
    });
    setFormError("");
  }

  function removeDiscountFromCurrentItem() {
    setForm((current) => {
      const variants = current.variants.map((variant) => ({
        ...variant,
        price: variant.compareAtPrice || variant.price,
        compareAtPrice: "",
      }));
      const defaultVariant =
        variants.find((variant) => variant.isDefault) ?? variants[0];
      return {
        ...current,
        variants,
        basePrice:
          defaultVariant?.price ??
          (current.compareAtPrice || current.basePrice),
        compareAtPrice: "",
      };
    });
    setItemDiscountValue("");
    setFormError("");
  }

  async function deleteItem() {
    if (!itemToDelete) return;
    setActing(true);
    try {
      const response = await fetch(
        `/api/v1/admin/menu/items/${itemToDelete._id}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as ApiResponse<null>;
      if (!response.ok || !payload.success)
        throw new Error(payload.message || "Unable to delete menu item.");
      setNotice(payload.message);
      setItemToDelete(null);
      await loadItems();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete menu item.",
      );
    } finally {
      setActing(false);
    }
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

