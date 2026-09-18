"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faDownload,
  faFilter,
  faFloppyDisk,
  faFolderTree,
  faImage,
  faIndianRupeeSign,
  faPercent,
  faPlus,
  faSearch,
  faTrash,
  faUpload,
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
  money,
  type ApiResponse,
  type Category,
  type ItemForm,
  type MenuItem,
  type ModifierGroup,
  type VariantForm,
} from "@/components/admin/menu/admin-menu.types";
import { createNaanPortionVariants, createPizzaVariants, isComboCategory as categoryIsCombo, isNaanCategory as categoryIsNaan, isPizzaCategory as categoryIsPizza } from "@/components/admin/menu/admin-menu.utils";
import { Field, Toggle } from "@/components/admin/menu/AdminMenuUi";
import { AdminMenuCatalogControls } from "@/components/admin/menu/AdminMenuCatalogControls";
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

      <AnimatePresence>
        {editorOpen && (
          <>
            <motion.button
              aria-label="Close menu item editor"
              onClick={() => setEditorOpen(false)}
              className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[111] max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#fffdf9] shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:max-w-2xl sm:rounded-none"
            >
              <form onSubmit={saveItem}>
                <div className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#C8102E]">
                      Catalog editor
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black sm:text-xl text-[#122b3c]">
                      {editingId ? "Edit menu item" : "Create menu item"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d9cf]"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
                <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
                  {formError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                      {formError}
                    </div>
                  )}
                  <div className="overflow-hidden rounded-[22px] border border-dashed border-[#d9cbc0] bg-white">
                    <div className="grid min-h-48 place-items-center bg-[#fff3ec]">
                      {form.imageUrl ? (
                        <img
                          src={form.imageUrl}
                          alt="Menu item preview"
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-[#8c7f76]">
                          <FontAwesomeIcon icon={faImage} className="h-9" />
                          <p className="mt-2 text-xs font-bold">
                            No menu image selected
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 p-3">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadItemImage(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#122b3c] px-4 text-xs font-black text-white disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faUpload} />
                        {uploadingImage ? "Uploading…" : "Upload from device"}
                      </button>
                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({ ...current, imageUrl: "" }))
                          }
                          className="h-10 rounded-xl border border-red-100 px-4 text-xs font-black text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="px-3 pb-3 text-[11px] font-semibold text-[#81746b]">
                      JPG, PNG, WebP or AVIF · Maximum 5 MB
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#eadfd5] bg-[#fff8f2] px-4 py-3 text-xs leading-5 text-[#6d5f55]">
                    {isComboCategory
                      ? "Combo mode is active. Select at least two menu items below; the original price, savings and discount are calculated automatically. Enter only the combo selling price."
                      : "For regular items, enter one selling price. For Pizza, select the Pizza category and enter separate prices for Small, Medium and Large."}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Item name *">
                      <input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="field"
                      />
                    </Field>
                    <Field label="Slug">
                      <input
                        value={form.slug}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                        placeholder="Generated automatically"
                        className="field"
                      />
                    </Field>
                    <Field label="Category *">
                      <select
                        value={form.categoryId}
                        onChange={(event) =>
                          handleCategoryChange(event.target.value)
                        }
                        className="field"
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter((category) => category.isActive)
                          .map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    {!hasRequiredVariants && (
                      <Field
                        label={
                          isComboCategory
                            ? "Combo selling price *"
                            : "Selling price *"
                        }
                      >
                        <div className="relative">
                          <FontAwesomeIcon
                            icon={faIndianRupeeSign}
                            className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.basePrice}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                basePrice: event.target.value,
                              }))
                            }
                            className="field price-field"
                          />
                        </div>
                      </Field>
                    )}
                    {!isComboCategory && !hasRequiredVariants && (
                      <Field label="Original / crossed price (optional)">
                        <div className="relative">
                          <FontAwesomeIcon
                            icon={faIndianRupeeSign}
                            className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.compareAtPrice}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                compareAtPrice: event.target.value,
                              }))
                            }
                            placeholder="Shown crossed out"
                            className="field price-field"
                          />
                        </div>
                      </Field>
                    )}
                    {!isComboCategory && (
                      <section className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="text-xs font-black text-[#122b3c]">
                              Item discount calculator
                            </h4>
                            <p className="mt-1 text-[10px] font-semibold leading-4 text-emerald-800">
                              Apply one percentage or fixed-amount discount to
                              this item. For items with sizes, it updates every
                              variant and keeps each original price crossed out.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto_auto]">
                          <select
                            value={itemDiscountType}
                            onChange={(event) =>
                              setItemDiscountType(
                                event.target.value as "percentage" | "fixed",
                              )
                            }
                            className="field"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed amount (₹)</option>
                          </select>
                          <div className="relative">
                            <FontAwesomeIcon
                              icon={
                                itemDiscountType === "percentage"
                                  ? faPercent
                                  : faIndianRupeeSign
                              }
                              className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"
                            />
                            <input
                              type="number"
                              min="0.01"
                              max={
                                itemDiscountType === "percentage"
                                  ? "99.99"
                                  : undefined
                              }
                              step="0.01"
                              value={itemDiscountValue}
                              onChange={(event) =>
                                setItemDiscountValue(event.target.value)
                              }
                              placeholder={
                                itemDiscountType === "percentage"
                                  ? "Example: 20"
                                  : "Example: 50"
                              }
                              className="field price-field"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={applyDiscountToCurrentItem}
                            className="h-11 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={removeDiscountFromCurrentItem}
                            className="h-11 rounded-xl border border-emerald-300 bg-white px-4 text-xs font-black text-emerald-800"
                          >
                            Remove
                          </button>
                        </div>
                      </section>
                    )}
                    {!isComboCategory && (
                      <Field label="Preparation time">
                        <input
                          type="number"
                          min="0"
                          max="240"
                          value={form.preparationTimeMinutes}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              preparationTimeMinutes: event.target.value,
                            }))
                          }
                          className="field"
                        />
                      </Field>
                    )}
                    {!isComboCategory && (
                      <Field label="Spice level">
                        <select
                          value={form.spiceLevel}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              spiceLevel: event.target
                                .value as MenuItem["spiceLevel"],
                            }))
                          }
                          className="field"
                        >
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="medium">Medium</option>
                          <option value="hot">Hot</option>
                        </select>
                      </Field>
                    )}
                    <Field label="Display order">
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            sortOrder: event.target.value,
                          }))
                        }
                        className="field"
                      />
                    </Field>
                    {!isComboCategory && (
                      <Field label="Tags">
                        <input
                          value={form.tags}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              tags: event.target.value,
                            }))
                          }
                          placeholder="pizza, cheese, bestseller"
                          className="field"
                        />
                      </Field>
                    )}
                  </div>
                  <Field label="Menu card description">
                    <textarea
                      value={form.shortDescription}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          shortDescription: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Short description shown on menu cards"
                      className="field min-h-24 py-3"
                    />
                  </Field>
                  <Field label="Detailed item description">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Ingredients, taste, preparation details and serving information"
                      className="field min-h-32 py-3"
                    />
                  </Field>

                  {hasRequiredVariants && (
                    <section className="rounded-[22px] border border-[#eadfd5] bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-[#122b3c]">
                            {isPizzaCategory
                              ? "Pizza size prices"
                              : "Half / Full plate prices"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#786b62]">
                            {isPizzaCategory
                              ? "Enter prices for Small, Medium and Large."
                              : "Half includes 1 naan and Full includes 2 naans. Sabji is selected separately."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            isPizzaCategory
                              ? applyPizzaVariantPreset()
                              : setForm((current) => ({
                                  ...current,
                                  basePrice: "",
                                  variants: createNaanPortionVariants(),
                                }))
                          }
                          className="rounded-xl border border-[#e5d9cf] px-3 py-2 text-[10px] font-black text-[#122b3c]"
                        >
                          {isPizzaCategory
                            ? "Reset pizza sizes"
                            : "Reset portions"}
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        {form.variants.map((variant, index) => (
                          <div
                            key={`${variant.name}-${index}`}
                            className="rounded-2xl border border-[#eadfd5] bg-[#fffaf6] p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Option name *">
                                <input
                                  value={variant.name}
                                  onChange={(event) =>
                                    updateVariant(index, {
                                      name: event.target.value,
                                    })
                                  }
                                  placeholder="Small 7 inch"
                                  className="field"
                                />
                              </Field>
                              <Field label="SKU">
                                <input
                                  value={variant.sku}
                                  onChange={(event) =>
                                    updateVariant(index, {
                                      sku: event.target.value,
                                    })
                                  }
                                  placeholder="SMALL-7"
                                  className="field"
                                />
                              </Field>
                              {isPizzaCategory ? (
                                <>
                                  <Field label="Selling price *">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={variant.price}
                                      onChange={(event) =>
                                        updateVariant(index, {
                                          price: event.target.value,
                                        })
                                      }
                                      className="field"
                                    />
                                  </Field>
                                  <Field label="Original / crossed price">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={variant.compareAtPrice}
                                      onChange={(event) =>
                                        updateVariant(index, {
                                          compareAtPrice: event.target.value,
                                        })
                                      }
                                      placeholder="Crossed price"
                                      className="field"
                                    />
                                  </Field>
                                </>
                              ) : (
                                <div className="rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-xs leading-5 text-[#786b62]">
                                  Price is calculated from the Half/Full +
                                  second-sabji matrix below.
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-xs font-black text-[#122b3c]">
                                <input
                                  type="radio"
                                  name="default-variant"
                                  checked={variant.isDefault}
                                  onChange={() =>
                                    updateVariant(index, { isDefault: true })
                                  }
                                  className="accent-[#C8102E]"
                                />
                                Default option
                              </label>
                              <label className="flex items-center gap-2 text-xs font-black text-[#122b3c]">
                                <input
                                  type="checkbox"
                                  checked={variant.isActive}
                                  onChange={(event) =>
                                    updateVariant(index, {
                                      isActive: event.target.checked,
                                    })
                                  }
                                  className="accent-[#C8102E]"
                                />
                                Active
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {isPizzaCategory && (
                    <section className="rounded-[22px] border border-[#eadfd5] bg-[#fff8f2] p-4">
                      <div>
                        <p className="text-sm font-black text-[#122b3c]">
                          Pizza crust configuration
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#786b62]">
                          Thin crust is offered only for Medium size. Cheese
                          Burst and Classic Cheese Burst pizzas are always
                          excluded.
                        </p>
                      </div>
                      <div className="mt-4">
                        <Toggle
                          label="Enable thin crust on Medium"
                          checked={
                            !isThinCrustExcludedPizza(form.name) &&
                            form.pizzaConfiguration.thinCrustAvailable
                          }
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              pizzaConfiguration: {
                                ...current.pizzaConfiguration,
                                thinCrustAvailable: checked,
                                thinCrustPriceAdjustment: "0",
                              },
                            }))
                          }
                        />
                      </div>
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#786b62]">
                        Thin crust uses the normal Medium pizza price. No extra
                        charge is applied.
                      </p>
                      {isThinCrustExcludedPizza(form.name) && (
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                          Thin crust is disabled because this is a Cheese Burst
                          pizza.
                        </p>
                      )}
                    </section>
                  )}
                  {isNaanCategory && (
                    <section className="rounded-[22px] border border-[#eadfd5] bg-[#fff8f2] p-4">
                      <div>
                        <p className="text-sm font-black text-[#122b3c]">
                          Platter combination pricing
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#786b62]">
                          Set the exact price for each Half/Full + second sabji
                          combination. Dal Makhani, Boondi Raita and Salad are
                          included.
                        </p>
                      </div>
                      <div className="mt-4">
                        <Field label="Second sabji modifier group *">
                          <select
                            value={form.combinationPricing.modifierGroupId}
                            onChange={(event) =>
                              selectCombinationGroup(event.target.value)
                            }
                            className="field"
                          >
                            <option value="">Select group</option>
                            {modifierGroups
                              .filter(
                                (group) =>
                                  group.isActive &&
                                  group.selectionType === "single" &&
                                  group.options.some(
                                    (option) => option._id && option.isActive,
                                  ),
                              )
                              .map((group) => (
                                <option key={group._id} value={group._id}>
                                  {group.name}
                                </option>
                              ))}
                          </select>
                        </Field>
                      </div>
                      {combinationGroup && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[520px] text-xs">
                            <thead>
                              <tr>
                                <th className="p-2 text-left">Portion</th>
                                {combinationGroup.options
                                  .filter(
                                    (option) =>
                                      option._id &&
                                      option.isActive &&
                                      option.isAvailable !== false,
                                  )
                                  .map((option) => (
                                    <th
                                      key={option._id}
                                      className="p-2 text-left"
                                    >
                                      {option.name}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {form.variants.map((variant) => (
                                <tr
                                  key={variant.name}
                                  className="border-t border-[#eadfd5]"
                                >
                                  <td className="p-2 font-black">
                                    {variant.name}
                                  </td>
                                  {combinationGroup.options
                                    .filter(
                                      (option) =>
                                        option._id &&
                                        option.isActive &&
                                        option.isAvailable !== false,
                                    )
                                    .map((option) => {
                                      const entry =
                                        form.combinationPricing.entries.find(
                                          (candidate) =>
                                            candidate.variantLabel ===
                                              variant.name &&
                                            candidate.optionId === option._id,
                                        );
                                      return (
                                        <td key={option._id} className="p-2">
                                          <div className="relative">
                                            <FontAwesomeIcon
                                              icon={faIndianRupeeSign}
                                              className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"
                                            />
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={entry?.price ?? ""}
                                              onChange={(event) =>
                                                updateCombinationPrice(
                                                  variant.name,
                                                  option._id as string,
                                                  event.target.value,
                                                )
                                              }
                                              className="field price-field"
                                            />
                                          </div>
                                        </td>
                                      );
                                    })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}

                  <section className="rounded-[22px] border border-[#eadfd5] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#122b3c]">
                          Customisation & add-ons
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#786b62]">
                          {isNaanCategory
                            ? "Only the platter choice and Extra Naan groups are available for Chur-Chur Naan."
                            : "Attach reusable groups such as Extra Cheese, Toppings, Dips and other item add-ons."}
                        </p>
                      </div>
                      <Link
                        href="/admin/menu/modifier-groups"
                        className="shrink-0 rounded-xl border border-[#e5d9cf] px-3 py-2 text-[10px] font-black text-[#122b3c]"
                      >
                        Manage groups
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {modifierGroups
                        .filter(
                          (group) =>
                            group.isActive &&
                            (!isNaanCategory ||
                              isAllowedNaanModifierGroup(
                                group.name,
                                group.internalName,
                              )),
                        )
                        .map((group) => {
                          const checked = form.modifierGroupIds.includes(
                            group._id,
                          );
                          return (
                            <label
                              key={group._id}
                              className={`rounded-2xl border p-3 text-xs font-bold ${checked ? "border-[#C8102E] bg-[#fff5f5]" : "border-[#eadfd5] bg-[#fffaf6]"}`}
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      modifierGroupIds: event.target.checked
                                        ? [
                                            ...current.modifierGroupIds,
                                            group._id,
                                          ]
                                        : current.modifierGroupIds.filter(
                                            (id) => id !== group._id,
                                          ),
                                    }))
                                  }
                                  className="accent-[#C8102E]"
                                />
                                {group.name}
                              </span>
                              <span className="mt-1 block text-[10px] font-medium text-[#81746b]">
                                {group.isRequired ? "Required" : "Optional"} ·{" "}
                                {group.selectionType} · {group.options.length}{" "}
                                options
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </section>
                  <section className="rounded-[22px] border border-[#eadfd5] bg-white p-4">
                    <p className="text-sm font-black text-[#122b3c]">
                      Mostly bought together
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#786b62]">
                      Select complementary menu items shown beneath this
                      product. Customers open each recommendation separately to
                      customise and add it.
                    </p>
                    <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                      {items
                        .filter((candidate) => candidate._id !== editingId)
                        .map((candidate) => {
                          const checked =
                            form.frequentlyOrderedWithIds.includes(
                              candidate._id,
                            );
                          return (
                            <label
                              key={candidate._id}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${checked ? "border-[#C8102E] bg-[#fff5f5]" : "border-[#eadfd5]"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    frequentlyOrderedWithIds: event.target
                                      .checked
                                      ? [
                                          ...current.frequentlyOrderedWithIds,
                                          candidate._id,
                                        ]
                                      : current.frequentlyOrderedWithIds.filter(
                                          (id) => id !== candidate._id,
                                        ),
                                  }))
                                }
                                className="accent-[#C8102E]"
                              />
                              <span className="truncate">{candidate.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </section>
                  <Field label="Allergens">
                    <input
                      value={form.allergens}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allergens: event.target.value,
                        }))
                      }
                      placeholder="gluten, dairy, nuts"
                      className="field"
                    />
                  </Field>
                  {isComboCategory && (
                    <section className="rounded-[22px] border border-[#eadfd5] bg-[#fff8f2] p-4">
                      <div>
                        <p className="text-sm font-black text-[#122b3c]">
                          Combo Builder
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#786b62]">
                          Build one sellable combo product from two or more
                          active menu items. Original price is recalculated by
                          the server from current menu prices.
                        </p>
                      </div>
                      <div className="mt-4 rounded-2xl border border-[#e5d9cf] bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[.12em] text-[#C8102E]">
                          Publishing & customer eligibility
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#786b62]">
                          Choose whether this combo appears on the Menu page,
                          Offers page, Permanent Offers or Today&apos;s Hot
                          Offers, and select the eligible loyalty tiers.
                        </p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {form.comboComponents.map((entry, index) => {
                          const selectedItem = comboCatalogItems.find(
                            (candidate) => candidate._id === entry.menuItemId,
                          );
                          return (
                            <div
                              key={`${index}-${entry.menuItemId}`}
                              className="grid gap-2 rounded-2xl border border-[#eadfd5] bg-white p-3 sm:grid-cols-[1fr_1fr_110px_auto]"
                            >
                              <Field label="Menu Item">
                                <select
                                  value={entry.menuItemId}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      comboComponents:
                                        current.comboComponents.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  menuItemId:
                                                    event.target.value,
                                                  variantId: "",
                                                }
                                              : row,
                                        ),
                                    }))
                                  }
                                  className="field"
                                >
                                  <option value="">Select item</option>
                                  {comboCatalogItems
                                    .filter(
                                      (candidate) =>
                                        candidate._id !== editingId,
                                    )
                                    .map((candidate) => (
                                      <option
                                        key={candidate._id}
                                        value={candidate._id}
                                      >
                                        {candidate.name}
                                      </option>
                                    ))}
                                </select>
                              </Field>
                              <Field label="Variant">
                                {selectedItem?.variants?.filter(
                                  (variant) => variant.isActive,
                                ).length ? (
                                  <select
                                    value={entry.variantId}
                                    onChange={(event) =>
                                      setForm((current) => ({
                                        ...current,
                                        comboComponents:
                                          current.comboComponents.map(
                                            (row, rowIndex) =>
                                              rowIndex === index
                                                ? {
                                                    ...row,
                                                    variantId:
                                                      event.target.value,
                                                  }
                                                : row,
                                          ),
                                      }))
                                    }
                                    className="field"
                                  >
                                    <option value="">Select variant</option>
                                    {selectedItem.variants
                                      .filter((variant) => variant.isActive)
                                      .map((variant) => (
                                        <option
                                          key={variant._id ?? variant.name}
                                          value={variant._id}
                                        >
                                          {variant.name} ·{" "}
                                          {money.format(variant.price)}
                                        </option>
                                      ))}
                                  </select>
                                ) : (
                                  <div className="field flex items-center text-[#81746b]">
                                    No variant
                                  </div>
                                )}
                              </Field>
                              <Field label="Quantity">
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={entry.quantity}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      comboComponents:
                                        current.comboComponents.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  quantity: event.target.value,
                                                }
                                              : row,
                                        ),
                                    }))
                                  }
                                  className="field"
                                />
                              </Field>
                              <button
                                type="button"
                                aria-label="Remove combo item"
                                disabled={form.comboComponents.length <= 2}
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    comboComponents:
                                      current.comboComponents.filter(
                                        (_, rowIndex) => rowIndex !== index,
                                      ),
                                  }))
                                }
                                className="mt-5 h-11 rounded-xl border border-red-200 px-3 text-red-700 disabled:opacity-40"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            comboComponents: [
                              ...current.comboComponents,
                              { menuItemId: "", variantId: "", quantity: "1" },
                            ],
                          }))
                        }
                        className="mt-3 rounded-xl border border-[#e5d9cf] bg-white px-4 py-2 text-xs font-black"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Add another item
                      </button>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-white p-3">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            Original price
                          </span>
                          <strong className="mt-1 block">
                            {money.format(comboCalculation.originalPrice)}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            Combo price
                          </span>
                          <strong className="mt-1 block text-[#C8102E]">
                            {money.format(Number(form.basePrice) || 0)}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            Savings
                          </span>
                          <strong className="mt-1 block text-emerald-700">
                            {money.format(comboCalculation.savings)}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            Discount
                          </span>
                          <strong className="mt-1 block">
                            {comboCalculation.discount.toFixed(1)}%
                          </strong>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Toggle
                          label="Publish combo on Offers page"
                          checked={form.publishComboOnOffersPage}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              publishComboOnOffersPage: checked,
                            }))
                          }
                        />
                        <Toggle
                          label="Show combo on Menu page"
                          checked={form.publishComboOnMenuPage}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              publishComboOnMenuPage: checked,
                            }))
                          }
                        />
                      </div>
                      {form.publishComboOnOffersPage && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Field label="Offers page placement">
                            <select
                              value={
                                form.comboOffersPageSection === "todays"
                                  ? "todays"
                                  : form.comboOfferType
                              }
                              onChange={(event) => {
                                const placement = event.target.value;
                                setForm((current) => ({
                                  ...current,
                                  comboOfferType:
                                    placement === "limited"
                                      ? "limited"
                                      : "permanent",
                                  comboOffersPageSection:
                                    placement === "todays"
                                      ? "todays"
                                      : "permanent",
                                  comboOfferStartsAt:
                                    placement === "permanent"
                                      ? ""
                                      : current.comboOfferStartsAt ||
                                        localDateTimeInputValue(),
                                  comboOfferExpiresAt:
                                    placement === "limited"
                                      ? current.comboOfferExpiresAt
                                      : "",
                                }));
                              }}
                              className="field"
                            >
                              <option value="permanent">
                                Permanent Offers
                              </option>
                              <option value="todays">
                                Today&apos;s Hot Offers (24 hours)
                              </option>
                              <option value="limited">
                                Limited Time Offer
                              </option>
                            </select>
                          </Field>
                          {(form.comboOfferType === "limited" ||
                            form.comboOffersPageSection === "todays") && (
                            <Field label="Offer starts">
                              <input
                                type="datetime-local"
                                value={form.comboOfferStartsAt ?? ""}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    comboOfferStartsAt: event.target.value,
                                  }))
                                }
                                className="field"
                              />
                            </Field>
                          )}
                          {form.comboOfferType === "limited" &&
                            form.comboOffersPageSection !== "todays" && (
                              <Field label="Offer expires">
                                <input
                                  type="datetime-local"
                                  value={form.comboOfferExpiresAt ?? ""}
                                  onChange={(event) =>
                                    setForm((current) => ({
                                      ...current,
                                      comboOfferExpiresAt: event.target.value,
                                    }))
                                  }
                                  className="field"
                                />
                              </Field>
                            )}
                        </div>
                      )}
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] font-black uppercase text-slate-500">
                          Eligible loyalty tiers
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {(
                            ["bronze", "silver", "gold", "platinum"] as const
                          ).map((tier) => (
                            <label
                              key={tier}
                              className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-black capitalize"
                            >
                              <input
                                type="checkbox"
                                checked={form.eligibleTierKeys.includes(tier)}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    eligibleTierKeys: event.target.checked
                                      ? [...current.eligibleTierKeys, tier]
                                      : current.eligibleTierKeys.filter(
                                          (key) => key !== tier,
                                        ),
                                  }))
                                }
                                className="accent-[#C8102E]"
                              />
                              {tier}
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Toggle
                      label="Dine-in"
                      checked={form.availableForDineIn}
                      onChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          availableForDineIn: checked,
                        }))
                      }
                    />
                    <Toggle
                      label="Pickup"
                      checked={form.availableForTakeaway}
                      onChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          availableForTakeaway: checked,
                        }))
                      }
                    />
                    <Toggle
                      label="Available"
                      checked={form.isAvailable}
                      onChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isAvailable: checked,
                        }))
                      }
                    />
                    <Toggle
                      label="Active"
                      checked={form.isActive}
                      onChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isActive: checked,
                        }))
                      }
                    />
                    {!isComboCategory && (
                      <>
                        <Toggle
                          label="Featured"
                          checked={form.isFeatured}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              isFeatured: checked,
                            }))
                          }
                        />
                        <Toggle
                          label="Bestseller"
                          checked={form.isBestseller}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              isBestseller: checked,
                            }))
                          }
                        />
                        <Toggle
                          label="Today's 24-hour special"
                          checked={form.isTodaysSpecialOffer}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              isTodaysSpecialOffer: checked,
                              todaysSpecialOfferStartsAt: checked
                                ? current.todaysSpecialOfferStartsAt ||
                                  localDateTimeInputValue()
                                : "",
                            }))
                          }
                        />
                        <Toggle
                          label="Track inventory"
                          checked={form.trackInventory}
                          onChange={(checked) =>
                            setForm((current) => ({
                              ...current,
                              trackInventory: checked,
                            }))
                          }
                        />
                      </>
                    )}
                  </div>
                  {!isComboCategory && form.isTodaysSpecialOffer && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <Field label="Special offer starts">
                        <input
                          type="datetime-local"
                          value={form.todaysSpecialOfferStartsAt}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              todaysSpecialOfferStartsAt: event.target.value,
                            }))
                          }
                          className="field"
                        />
                      </Field>
                      <p className="mt-2 text-[10px] font-semibold leading-4 text-amber-800">
                        The item appears in Today&apos;s Hot Offers and receives
                        a Today&apos;s Special Offer tag on the Menu page for
                        exactly 24 hours from this start time. The offer
                        designation disappears automatically when the window
                        ends.
                      </p>
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t sm:flex sm:justify-end border-[#e8ddd3] bg-[#fffdf9]/95 px-5 py-4 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="h-11 w-full rounded-2xl border sm:w-auto border-[#e5d9cf] px-5 text-xs font-black text-[#122b3c]"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={acting}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#C8102E] sm:w-auto px-5 text-xs font-black text-white disabled:opacity-60"
                  >
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    {acting ? "Saving…" : "Save item"}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
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
      <AnimatePresence>
        {bulkDiscountOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close bulk discount"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!acting) setBulkDiscountOpen(false);
              }}
              className="fixed inset-0 z-[80] bg-[#071923]/55 backdrop-blur-sm"
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-discount-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="fixed inset-x-4 top-1/2 z-[81] mx-auto w-auto max-w-lg -translate-y-1/2 rounded-[28px] border border-[#eadfd5] bg-[#fffdf9] p-5 shadow-2xl sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="bulk-discount-title"
                    className="text-lg font-black text-[#122b3c]"
                  >
                    Apply menu-item discount
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#756960]">
                    This will update {selected.length} selected item
                    {selected.length === 1 ? "" : "s"}. Existing discounts are
                    replaced using the stored original price, so repeated edits
                    do not compound accidentally.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkDiscountOpen(false)}
                  disabled={acting}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e5d9cf] bg-white text-[#122b3c]"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Discount type">
                  <select
                    value={bulkDiscountType}
                    onChange={(event) => {
                      setBulkDiscountType(
                        event.target.value as "percentage" | "fixed",
                      );
                      setBulkDiscountError("");
                    }}
                    className="field"
                  >
                    <option value="percentage">Percentage discount</option>
                    <option value="fixed">Fixed amount discount</option>
                  </select>
                </Field>
                <Field
                  label={
                    bulkDiscountType === "percentage"
                      ? "Discount percentage"
                      : "Discount amount"
                  }
                >
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={
                        bulkDiscountType === "percentage"
                          ? faPercent
                          : faIndianRupeeSign
                      }
                      className="absolute left-3 top-1/2 h-3 -translate-y-1/2 text-[#8c7f76]"
                    />
                    <input
                      type="number"
                      min="0.01"
                      max={
                        bulkDiscountType === "percentage" ? "99.99" : undefined
                      }
                      step="0.01"
                      value={bulkDiscountValue}
                      onChange={(event) => {
                        setBulkDiscountValue(event.target.value);
                        setBulkDiscountError("");
                      }}
                      placeholder={
                        bulkDiscountType === "percentage" ? "20" : "50"
                      }
                      className="field price-field"
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-900">
                Percentage applies the same percent to every selected item and
                every size. Fixed amount subtracts the same rupee amount from
                each item or size. Combos are intentionally rejected because
                their selling price belongs to the Combo Builder.
              </div>
              {bulkDiscountError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {bulkDiscountError}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBulkDiscountOpen(false)}
                  disabled={acting}
                  className="h-11 rounded-2xl border border-[#e5d9cf] bg-white text-xs font-black text-[#122b3c]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void applyBulkDiscount("apply_discount")}
                  disabled={acting}
                  className="h-11 rounded-2xl bg-[#C8102E] text-xs font-black text-white disabled:opacity-60"
                >
                  {acting ? "Applying…" : "Apply discount"}
                </button>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
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

