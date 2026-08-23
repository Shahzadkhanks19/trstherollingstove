"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCartPlus,
  faCheck,
  faCircleInfo,
  faFire,
  faLeaf,
  faMinus,
  faPlus,
  faShieldHeart,
  faStar,
  faStore,
  faUtensils,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addGuestCartItem, getCurrentCustomer, publishCartUpdated } from "@/lib/cart-client";
import type {
  AddToCartPayload,
  MenuItemDetails,
  MenuOptionGroup,
} from "@/types/menu";
import {
  getCategoryGuidance,
  getCustomerVisibleOptionGroups,
} from "@/lib/menu-option-rules";
import { MediaPlaceholder } from "@/components/site/MediaPlaceholder";
import {
  MIXED_NAAN_GROUP_ID,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";

type SelectedOptionState = Record<string, Record<string, number>>;

type Tab = "description" | "ingredients" | "nutrition" | "reviews";

type TrustItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

const trustItems: TrustItem[] = [
  {
    icon: faLeaf,
    title: "100% Vegetarian",
    text: "Pure vegetarian menu",
  },
  {
    icon: faUtensils,
    title: "Fresh Preparation",
    text: "Prepared after ordering",
  },
  {
    icon: faShieldHeart,
    title: "Hygienic Kitchen",
    text: "Cooked with care",
  },
  {
    icon: faStore,
    title: "Dine-in or Takeaway",
    text: "Choose at checkout",
  },
];

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isMongoObjectId(value: string | undefined): value is string {
  return Boolean(value && /^[a-f\d]{24}$/i.test(value));
}

function canonicalVariantLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("small") || normalized.includes("regular")) return "regular";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("large")) return "large";
  if (normalized.includes("half")) return "half";
  if (normalized.includes("full")) return "full";
  return normalized;
}

function getChoicePrice(
  choice: MenuOptionGroup["choices"][number],
  variantLabel?: string,
): number {
  if (!variantLabel || !choice.variantPrices?.length) return choice.price;

  const normalizedVariant = canonicalVariantLabel(variantLabel);
  const matchingPrice = choice.variantPrices.find(
    (entry) => canonicalVariantLabel(entry.variantLabel) === normalizedVariant,
  );

  return matchingPrice?.price ?? choice.price;
}

function initialiseOptions(groups: MenuOptionGroup[]): SelectedOptionState {
  return groups.reduce<SelectedOptionState>((state, group) => {
    const defaults = group.choices.reduce<Record<string, number>>(
      (choices, choice) => {
        if (choice.isDefault && choice.isAvailable !== false) {
          choices[choice.id] = 1;
        }
        return choices;
      },
      {},
    );

    state[group.id] = defaults;
    return state;
  }, {});
}

export function MenuItemDetailsClient({
  item,
}: {
  item: MenuItemDetails;
}) {
  const configuredGroups = useMemo(
    () => getCustomerVisibleOptionGroups(item),
    [item],
  );

  const defaultPriceOption =
    item.pricingOptions?.find((option) => option.isDefault) ??
    item.pricingOptions?.find((option) => option.isAvailable !== false) ??
    null;

  const [selectedPriceOptionId, setSelectedPriceOptionId] = useState(
    defaultPriceOption?.id ?? "",
  );
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionState>(
    () => initialiseOptions(configuredGroups),
  );
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [mixedSecondNaanId, setMixedSecondNaanId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [feedback, setFeedback] = useState("");

  const selectedPriceOption =
    item.pricingOptions?.find(
      (option) => option.id === selectedPriceOptionId,
    ) ?? defaultPriceOption;

  const visibleGroups = useMemo(
    () => configuredGroups.filter(
      (group) => group.code !== "crust" || canonicalVariantLabel(selectedPriceOption?.label ?? "") === "medium",
    ),
    [configuredGroups, selectedPriceOption?.label],
  );

  const optionTotal = visibleGroups.reduce((groupTotal, group) => {
    const selectedForGroup = selectedOptions[group.id] ?? {};

    return (
      groupTotal +
      group.choices.reduce((choiceTotal, choice) => {
        return (
          choiceTotal +
          getChoicePrice(choice, selectedPriceOption?.label) *
            (selectedForGroup[choice.id] ?? 0)
        );
      }, 0)
    );
  }, 0);

  const hasExtraToppingSelected = visibleGroups.some((group) => {
    if (group.code !== "extra_toppings") return false;
    return Object.values(selectedOptions[group.id] ?? {}).some(
      (selectedQuantity) => selectedQuantity > 0,
    );
  });

  const configuredCombinationPrice = (() => {
    const pricing = item.combinationPricing;
    const selectedVariantLabel = selectedPriceOption?.label;

    if (!pricing?.enabled || !pricing.modifierGroupId || !selectedVariantLabel) {
      return null;
    }

    const selectedForGroup = selectedOptions[pricing.modifierGroupId] ?? {};
    const selectedOptionId = Object.entries(selectedForGroup).find(
      ([, selectedQuantity]) => selectedQuantity > 0,
    )?.[0];

    if (!selectedOptionId) return null;

    const variantKey = canonicalVariantLabel(selectedVariantLabel);
    const entry = pricing.entries.find(
      (candidate) =>
        candidate.optionId === selectedOptionId &&
        canonicalVariantLabel(candidate.variantLabel) === variantKey,
    );

    return entry?.price ?? null;
  })();

  const basePrice = configuredCombinationPrice ?? selectedPriceOption?.price ?? item.priceFrom;
  const selectedPlatterOption = (() => {
    const groupId = item.combinationPricing?.modifierGroupId;
    if (!groupId) return null;
    const selectedId = Object.entries(selectedOptions[groupId] ?? {}).find(
      ([, count]) => count > 0,
    )?.[0];
    if (!selectedId) return null;
    const group = visibleGroups.find((candidate) => candidate.id === groupId);
    const choice = group?.choices.find((candidate) => candidate.id === selectedId);
    return choice ? { id: selectedId, name: choice.name } : null;
  })();
  const selectedMixedNaan = item.mixedNaanOptions?.find(
    (candidate) => candidate.menuItemId === mixedSecondNaanId,
  );
  const mixedNaanPrice =
    selectedMixedNaan &&
    selectedPlatterOption &&
    selectedPriceOption?.label &&
    isFullPortion(selectedPriceOption.label)
      ? findMixedNaanPrice(
          selectedMixedNaan.prices,
          selectedPriceOption.label,
          selectedPlatterOption.id,
          selectedPlatterOption.name,
        )
      : null;
  const mixedNaanAdjustment =
    mixedNaanPrice == null ? 0 : Math.max(0, mixedNaanPrice - basePrice);
  const unitTotal = basePrice + optionTotal + mixedNaanAdjustment;
  const total = unitTotal * quantity;

  const updateChoice = (
    group: MenuOptionGroup,
    choiceId: string,
    nextQuantity?: number,
  ): void => {
    setFeedback("");

    setSelectedOptions((current) => {
      const groupState = current[group.id] ?? {};
      const choice = group.choices.find((entry) => entry.id === choiceId);
      if (!choice || choice.isAvailable === false) return current;

      if (group.selectionType === "single") {
        return {
          ...current,
          [group.id]: {
            [choiceId]: 1,
          },
        };
      }

      const currentQuantity = groupState[choiceId] ?? 0;
      const calculatedQuantity =
        nextQuantity ??
        (group.selectionType === "quantity"
          ? currentQuantity + 1
          : currentQuantity > 0
            ? 0
            : 1);

      const selectedInGroup = Object.entries(groupState).reduce(
        (sum, [id, value]) => sum + (id === choiceId ? 0 : value),
        0,
      );
      const optionMaximum = choice.maxQuantity ?? 1;
      const groupMaximum = group.maxSelections ?? Number.POSITIVE_INFINITY;
      const safeQuantity = Math.max(
        0,
        Math.min(calculatedQuantity, optionMaximum, groupMaximum - selectedInGroup),
      );

      return {
        ...current,
        [group.id]: {
          ...groupState,
          [choiceId]: safeQuantity,
        },
      };
    });
  };

  const validateSelections = (): string | null => {
    if (item.pricingOptions?.length && !selectedPriceOptionId) {
      return "Select a size or portion.";
    }

    for (const group of visibleGroups) {
      if (!group.required) continue;

      const selectedCount = Object.values(
        selectedOptions[group.id] ?? {},
      ).reduce((sum, value) => sum + value, 0);

      if (selectedCount < (group.minSelections ?? 1)) {
        return `Select ${group.name.toLowerCase()}.`;
      }
    }

    return null;
  };

  const createPayload = (): AddToCartPayload => ({
    itemId: item.id,
    quantity,
    selectedPriceOptionId: isMongoObjectId(selectedPriceOption?.id)
      ? selectedPriceOption.id
      : isMongoObjectId(selectedPriceOptionId)
        ? selectedPriceOptionId
        : "",
    selectedOptions: [
      ...visibleGroups.flatMap((group) =>
        Object.entries(selectedOptions[group.id] ?? {})
          .filter(([, selectedQuantity]) => selectedQuantity > 0)
          .map(([choiceId, selectedQuantity]) => ({
            groupId: group.id,
            choiceId,
            quantity: selectedQuantity,
          })),
      ),
      ...(mixedSecondNaanId
        ? [{
            groupId: MIXED_NAAN_GROUP_ID,
            choiceId: mixedSecondNaanId,
            quantity: 1,
          }]
        : []),
    ],
    specialInstructions: specialInstructions.trim() || undefined,
  });

  const addToCart = async (orderNow: boolean): Promise<void> => {
    const validationMessage = validateSelections();

    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }

    const payload = createPayload();
    setFeedback("Adding item...");

    try {
      const authenticated = await getCurrentCustomer();
      const selectedModifierLines = payload.selectedOptions.flatMap((selection) => {
        if (selection.groupId === MIXED_NAAN_GROUP_ID) {
          const alternate = item.mixedNaanOptions?.find(
            (entry) => entry.menuItemId === selection.choiceId,
          );
          if (!alternate) return [];
          return [{
            groupId: MIXED_NAAN_GROUP_ID,
            optionId: alternate.menuItemId,
            optionName: alternate.name,
            unitPrice: mixedNaanAdjustment,
          }];
        }
        const group = visibleGroups.find((entry) => entry.id === selection.groupId);
        const choice = group?.choices.find((entry) => entry.id === selection.choiceId);
        if (!group || !choice) return [];
        return Array.from({ length: Math.max(1, selection.quantity) }, () => ({
          groupId: selection.groupId,
          optionId: selection.choiceId,
          optionName: choice.name,
          unitPrice: getChoicePrice(choice, selectedPriceOption?.label),
        }));
      });

      if (!authenticated) {
        const guestCart = addGuestCartItem({
          menuItemId: payload.itemId,
          variantId: payload.selectedPriceOptionId || null,
          name: item.name,
          imageUrl: item.media[0]?.url,
          variantName: selectedPriceOption?.label,
          baseUnitPrice: basePrice,
          modifiers: selectedModifierLines,
          quantity: payload.quantity,
          specialInstructions: payload.specialInstructions,
        });
        publishCartUpdated(guestCart.itemCount);
      } else {
        const response = await fetch("/api/v1/customer/cart/items", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuItemId: payload.itemId,
            variantId: payload.selectedPriceOptionId || null,
            modifiers: selectedModifierLines.map((selection) => ({
              groupId: selection.groupId,
              optionId: selection.optionId,
            })),
            quantity: payload.quantity,
            specialInstructions: payload.specialInstructions ?? "",
          }),
        });
        const body = (await response.json()) as { message?: string; data?: { itemCount?: number } };
        if (!response.ok) throw new Error(body.message || "Unable to add item to cart.");
        publishCartUpdated(body.data?.itemCount ?? quantity);
      }

      setFeedback("Item added to cart.");
      if (orderNow) window.location.assign("/cart");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to add item to cart.");
    }
  };

  const gallery = item.media.length ? item.media : [];

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="border-b border-[#EDE3D8] py-5">
        <div className="mx-auto flex w-[min(100%-2rem,1320px)] items-center gap-3 text-[10px] font-bold text-[#655E57]">
          <Link href="/menu" className="inline-flex items-center gap-2 text-[#C8102E]">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3" />
            Back to Menu
          </Link>
          <span>/</span>
          <span>{item.category.name}</span>
          <span>/</span>
          <span className="truncate text-[#172536]">{item.name}</span>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="mx-auto grid w-[min(100%-2rem,1320px)] min-w-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)]">
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-[#E8D8C9] bg-white shadow-[0_24px_60px_rgba(50,30,15,.08)]">
              {item.isBestseller && (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-[#C8102E] px-4 py-2 text-[9px] font-black uppercase text-white">
                  Bestseller
                </span>
              )}

              {gallery[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gallery[0].url}
                  alt={gallery[0].alt || item.name}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <MediaPlaceholder
                  label={`${item.name} main image`}
                  className="aspect-[4/3] w-full border-0"
                />
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {gallery.slice(0, 5).map((media) => (
                  <div
                    key={media.id}
                    className="overflow-hidden rounded-xl border border-[#E8D8C9] bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.url}
                      alt={media.alt}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <div className="flex gap-5 overflow-x-auto border-b border-[#EDE3D8]">
                {(["description", "ingredients", "nutrition", "reviews"] as Tab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`shrink-0 border-b-2 pb-3 text-[10px] font-black uppercase ${
                        activeTab === tab
                          ? "border-[#C8102E] text-[#C8102E]"
                          : "border-transparent text-[#655E57]"
                      }`}
                    >
                      {tab}
                      {tab === "reviews" && item.reviewSummary
                        ? ` (${item.reviewSummary.totalReviews})`
                        : ""}
                    </button>
                  ),
                )}
              </div>

              <div className="min-h-[130px] py-6 text-sm leading-7 text-[#625B55]">
                {activeTab === "description" && <p>{item.description}</p>}

                {activeTab === "ingredients" && (
                  <div className="flex flex-wrap gap-2">
                    {(item.ingredients?.length
                      ? item.ingredients
                      : ["Ingredient information will be added from admin"]
                    ).map((ingredient) => (
                      <span
                        key={ingredient}
                        className="rounded-full border border-[#E8D8C9] bg-white px-4 py-2 text-[10px] font-semibold"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                )}

                {activeTab === "nutrition" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {item.nutrition ? (
                      Object.entries(item.nutrition).map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-[#EDE3D8] bg-white p-4"
                        >
                          <strong className="block text-[9px] uppercase text-[#C8102E]">
                            {key.replace(/([A-Z])/g, " $1")}
                          </strong>
                          <span className="mt-1 block text-sm font-bold">
                            {String(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>Nutrition details will be maintained from the admin dashboard.</p>
                    )}
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="rounded-2xl border border-[#EDE3D8] bg-white p-5">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faStar} className="h-5 text-[#E8A53A]" />
                      <strong className="text-2xl">
                        {item.reviewSummary?.averageRating ?? "New"}
                      </strong>
                      <span className="text-[10px]">
                        {item.reviewSummary
                          ? `${item.reviewSummary.totalReviews} verified reviews`
                          : "No published reviews yet"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-black uppercase">
                  Mostly Bought Together
                </h2>
                <Link
                  href={`/menu?category=${encodeURIComponent(item.category.slug)}`}
                  className="text-[9px] font-black uppercase text-[#C8102E]"
                >
                  View Category
                </Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(item.frequentlyOrderedWith?.length ? item.frequentlyOrderedWith : item.relatedItems ?? [])
                  .slice(0, 6)
                  .map((related) => (
                    <Link
                      key={related.id}
                      href={`/menu/${related.slug}`}
                      className="overflow-hidden rounded-2xl border border-[#EDE3D8] bg-white transition hover:-translate-y-1 hover:border-[#C8102E]"
                    >
                      {related.thumbnail?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={related.thumbnail.url}
                          alt={related.thumbnail.alt}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <MediaPlaceholder
                          label={`${related.name} image`}
                          className="aspect-[4/3] w-full border-0"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="text-sm font-black">{related.name}</h3>
                        <p className="mt-2 text-sm font-black text-[#C8102E]">
                          From {formatPrice(related.priceFrom)}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-[100px] lg:self-start">
            <section className="rounded-[2rem] border border-[#EDE3D8] bg-white p-5 shadow-[0_24px_60px_rgba(50,30,15,.09)] sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                {item.isBestseller && (
                  <span className="rounded-full bg-[#FFF1E5] px-3 py-1.5 text-[8px] font-black uppercase text-[#C8102E]">
                    Bestseller
                  </span>
                )}
                {item.isNew && (
                  <span className="rounded-full bg-[#F1FBF3] px-3 py-1.5 text-[8px] font-black uppercase text-[#287238]">
                    New
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                {item.name}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#655E57]">
                {item.shortDescription ?? item.description}
              </p>

              {item.reviewSummary && (
                <div className="mt-4 flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 font-black">
                    <FontAwesomeIcon icon={faStar} className="h-3 text-[#E8A53A]" />
                    {item.reviewSummary.averageRating}
                  </span>
                  <span className="text-[#8A8179]">
                    {item.reviewSummary.totalReviews} reviews
                  </span>
                </div>
              )}

              <div className="mt-5 flex items-end gap-3">
                <strong className="text-3xl font-black text-[#C8102E]">
                  {formatPrice(basePrice)}
                </strong>
                {selectedPriceOption?.compareAtPrice &&
                  selectedPriceOption.compareAtPrice > basePrice && (
                    <>
                      <span className="pb-1 text-sm text-[#8A8179] line-through">
                        {formatPrice(selectedPriceOption.compareAtPrice)}
                      </span>
                      <span className="mb-1 rounded-full bg-[#173044] px-2.5 py-1 text-[9px] font-black uppercase text-white">
                        {Math.round(((selectedPriceOption.compareAtPrice - basePrice) / selectedPriceOption.compareAtPrice) * 100)}% off
                      </span>
                    </>
                  )}
              </div>

              <div className="my-6 h-px bg-[#EDE3D8]" />

              <h2 className="text-lg font-black uppercase text-[#C8102E]">
                Customise Your Order
              </h2>

              {item.pricingOptions && item.pricingOptions.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-black uppercase">
                      Select Size / Portion
                    </h3>
                    <span className="text-[8px] text-[#8A8179]">
                      Required
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {item.pricingOptions
                      .filter((option) => option.isAvailable !== false)
                      .map((option) => {
                        const selected = option.id === selectedPriceOptionId;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                      setSelectedPriceOptionId(option.id);
                      if (!isFullPortion(option.label)) setMixedSecondNaanId("");
                    }}
                            className={`relative rounded-xl border p-3 text-center transition ${
                              selected
                                ? "border-[#C8102E] bg-[#FFF3F3]"
                                : "border-[#E5D9CD] bg-[#FFFDF9]"
                            }`}
                          >
                            {selected && (
                              <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#C8102E] text-white">
                                <FontAwesomeIcon icon={faCheck} className="h-2" />
                              </span>
                            )}
                            <span className="block text-[9px] font-black">
                              {option.label}
                            </span>
                            {!item.combinationPricing?.enabled && (
                              <span className="mt-1 block text-sm font-black">
                                {formatPrice(option.price)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-6">
                {visibleGroups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[10px] font-black uppercase">
                        {group.name}
                      </h3>
                      <span className="text-[8px] text-[#8A8179]">
                        {group.required ? "Required" : "Optional"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {group.choices
                        .filter((choice) => choice.isAvailable !== false)
                        .map((choice) => {
                          const selectedQuantity =
                            selectedOptions[group.id]?.[choice.id] ?? 0;
                          const selected = selectedQuantity > 0;

                          return (
                            <div
                              key={choice.id}
                              className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${
                                selected
                                  ? "border-[#C8102E] bg-[#FFF8F8]"
                                  : "border-[#E5D9CD] bg-[#FFFDF9]"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => updateChoice(group, choice.id)}
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                                  selected
                                    ? "border-[#C8102E] bg-[#C8102E] text-white"
                                    : "border-[#BFB6AD] bg-white text-transparent"
                                }`}
                                aria-label={`Select ${choice.name}`}
                              >
                                <FontAwesomeIcon icon={faCheck} className="h-2" />
                              </button>

                              <button
                                type="button"
                                onClick={() => updateChoice(group, choice.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="block text-[10px] font-black">
                                  {choice.name}
                                </span>
                                {choice.description && (
                                  <span className="mt-1 block text-[8px] leading-4 text-[#7A726B]">
                                    {choice.description}
                                  </span>
                                )}
                              </button>

                              {getChoicePrice(choice, selectedPriceOption?.label) > 0 && (
                                <span className="shrink-0 text-[10px] font-black">
                                  +{formatPrice(
                                    getChoicePrice(choice, selectedPriceOption?.label),
                                  )}
                                </span>
                              )}

                              {group.selectionType === "quantity" && (
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChoice(
                                        group,
                                        choice.id,
                                        selectedQuantity - 1,
                                      )
                                    }
                                    className="grid h-7 w-7 place-items-center rounded-lg border border-[#E5D9CD]"
                                  >
                                    <FontAwesomeIcon icon={faMinus} className="h-2" />
                                  </button>
                                  <span className="w-4 text-center text-[10px] font-black">
                                    {selectedQuantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChoice(
                                        group,
                                        choice.id,
                                        selectedQuantity + 1,
                                      )
                                    }
                                    className="grid h-7 w-7 place-items-center rounded-lg border border-[#E5D9CD]"
                                  >
                                    <FontAwesomeIcon icon={faPlus} className="h-2" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>

              {isFullPortion(selectedPriceOption?.label ?? "") &&
            (item.mixedNaanOptions?.length ?? 0) > 0 && (
              <section className="rounded-[1.5rem] border border-[#E8D8C9] bg-white p-5">
                <h3 className="text-sm font-black text-[#172536]">Choose a different second naan</h3>
                <p className="mt-1 text-[10px] font-semibold leading-5 text-[#655E57]">
                  Optional. A Full platter includes two naans. Keep the default for two {item.name},
                  or choose another naan below. The higher Full-platter price applies.
                </p>
                <select
                  value={mixedSecondNaanId}
                  onChange={(event) => setMixedSecondNaanId(event.currentTarget.value)}
                  className="mt-4 h-12 w-full rounded-xl border border-[#DCCEC1] bg-white px-4 text-sm font-bold outline-none focus:border-[#C8102E]"
                >
                  <option value="">Two {item.name}</option>
                  {item.mixedNaanOptions?.map((option) => (
                    <option key={option.menuItemId} value={option.menuItemId}>
                      1 {item.name} + 1 {option.name}
                    </option>
                  ))}
                </select>
                {selectedMixedNaan && mixedNaanPrice != null ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-900">
                    Mixed Full platter price: {formatPrice(Math.max(basePrice, mixedNaanPrice))}
                  </p>
                ) : null}
              </section>
            )}

              {item.customerNotice && (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#F0D79D] bg-[#FFF7E6] p-4">
                  <FontAwesomeIcon
                    icon={faCircleInfo}
                    className="mt-0.5 h-4 shrink-0 text-[#D99219]"
                  />
                  <p className="text-[9px] leading-5 text-[#66552E]">
                    {item.customerNotice}
                  </p>
                </div>
              )}

              <label className="mt-6 block text-[10px] font-black uppercase">
                Special Instructions
                <textarea
                  value={specialInstructions}
                  onChange={(event) =>
                    setSpecialInstructions(event.target.value.slice(0, 250))
                  }
                  placeholder={
                    hasExtraToppingSelected
                      ? "Mention your preferred topping here, e.g. jalapeño, olives or paneer. You may also add other preparation notes."
                      : "Optional preparation note. Do not use this for allergy emergencies."
                  }
                  className="mt-2 min-h-[90px] w-full resize-none rounded-xl border border-[#E5D9CD] bg-[#FFFDF9] p-3 text-sm font-medium normal-case outline-none focus:border-[#C8102E]"
                />
                <span className="mt-1 block text-right text-[8px] font-medium normal-case text-[#8A8179]">
                  {specialInstructions.length}/250
                </span>
              </label>

              <div className="mt-6 rounded-2xl border border-[#EDE3D8] bg-[#FFFDF9] p-4">
                <div className="flex justify-between gap-4 text-[10px]">
                  <span>Item price</span>
                  <strong>{formatPrice(basePrice)}</strong>
                </div>
                <div className="mt-2 flex justify-between gap-4 text-[10px]">
                  <span>Add-ons</span>
                  <strong>{formatPrice(optionTotal)}</strong>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#EDE3D8] pt-4">
                  <div>
                    <span className="block text-[9px] uppercase text-[#655E57]">
                      Total
                    </span>
                    <strong className="text-2xl text-[#C8102E]">
                      {formatPrice(total)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#E5D9CD]"
                    >
                      <FontAwesomeIcon icon={faMinus} className="h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-black">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#E5D9CD]"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className="mt-4 rounded-xl border border-[#E8D8C9] bg-[#FFF7EA] px-4 py-3 text-[10px] font-semibold"
                >
                  {feedback}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void addToCart(false)}
                  className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#C8102E] bg-white px-4 text-[9px] font-black uppercase text-[#C8102E]"
                >
                  <FontAwesomeIcon icon={faCartPlus} className="h-4" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => void addToCart(true)}
                  className="flex h-12 items-center justify-center gap-3 rounded-xl bg-[#C8102E] px-4 text-[9px] font-black uppercase text-white"
                >
                  Add &amp; Order Now
                  <FontAwesomeIcon icon={faArrowRight} className="h-3" />
                </button>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-[#F0DFC8] bg-[#FFF7EA] p-5">
              <h2 className="text-[10px] font-black uppercase text-[#C8102E]">
                Category Configuration
              </h2>
              <div className="mt-3 grid gap-2">
                {getCategoryGuidance(item.category.slug).map((guidance) => (
                  <p
                    key={guidance}
                    className="flex gap-2 text-[9px] leading-4 text-[#655E57]"
                  >
                    <FontAwesomeIcon
                      icon={faFire}
                      className="mt-0.5 h-3 shrink-0 text-[#D99219]"
                    />
                    {guidance}
                  </p>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto grid w-[min(100%-2rem,1320px)] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#EDE3D8] bg-[#EDE3D8] lg:grid-cols-4">
          {trustItems.map(({ icon, title, text }) => (
            <article
              key={title}
              className="flex min-w-0 items-center gap-3 bg-white p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF1E5] text-[#D99219]">
                <FontAwesomeIcon icon={icon} className="h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[8px] font-black uppercase">{title}</h2>
                <p className="mt-1 text-[7px] leading-3 text-[#655E57]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
