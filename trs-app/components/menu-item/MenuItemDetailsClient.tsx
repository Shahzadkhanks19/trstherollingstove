"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCartPlus,
  faCircleInfo,
  faFire,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addGuestCartItem,
  getCurrentCustomer,
  publishCartUpdated,
} from "@/lib/cart-client";
import type {
  AddToCartPayload,
  MenuItemDetails,
  MenuOptionGroup,
} from "@/types/menu";
import {
  getCategoryGuidance,
  getCustomerVisibleOptionGroups,
} from "@/lib/menu-option-rules";
import {
  MIXED_NAAN_GROUP_ID,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";

import {
  canonicalVariantLabel,
  formatPrice,
  getChoicePrice,
  initialiseOptions,
  isMongoObjectId,
  trustItems,
  type SelectedOptionState,
  type Tab,
} from "@/components/menu-item/menu-item-utils";
import { MenuItemMediaDetails } from "@/components/menu-item/MenuItemMediaDetails";
import { MenuItemConfiguration } from "@/components/menu-item/MenuItemConfiguration";

export function MenuItemDetailsClient({ item }: { item: MenuItemDetails }) {
  const router = useRouter();
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
    () =>
      configuredGroups.filter(
        (group) =>
          group.code !== "crust" ||
          canonicalVariantLabel(selectedPriceOption?.label ?? "") === "medium",
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

    if (
      !pricing?.enabled ||
      !pricing.modifierGroupId ||
      !selectedVariantLabel
    ) {
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

  const basePrice =
    configuredCombinationPrice ?? selectedPriceOption?.price ?? item.priceFrom;
  const selectedPlatterOption = (() => {
    const groupId = item.combinationPricing?.modifierGroupId;
    if (!groupId) return null;
    const selectedId = Object.entries(selectedOptions[groupId] ?? {}).find(
      ([, count]) => count > 0,
    )?.[0];
    if (!selectedId) return null;
    const group = visibleGroups.find((candidate) => candidate.id === groupId);
    const choice = group?.choices.find(
      (candidate) => candidate.id === selectedId,
    );
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
        Math.min(
          calculatedQuantity,
          optionMaximum,
          groupMaximum - selectedInGroup,
        ),
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
        ? [
            {
              groupId: MIXED_NAAN_GROUP_ID,
              choiceId: mixedSecondNaanId,
              quantity: 1,
            },
          ]
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
      const selectedModifierLines = payload.selectedOptions.flatMap(
        (selection) => {
          if (selection.groupId === MIXED_NAAN_GROUP_ID) {
            const alternate = item.mixedNaanOptions?.find(
              (entry) => entry.menuItemId === selection.choiceId,
            );
            if (!alternate) return [];
            return [
              {
                groupId: MIXED_NAAN_GROUP_ID,
                optionId: alternate.menuItemId,
                optionName: alternate.name,
                unitPrice: mixedNaanAdjustment,
              },
            ];
          }
          const group = visibleGroups.find(
            (entry) => entry.id === selection.groupId,
          );
          const choice = group?.choices.find(
            (entry) => entry.id === selection.choiceId,
          );
          if (!group || !choice) return [];
          return Array.from(
            { length: Math.max(1, selection.quantity) },
            () => ({
              groupId: selection.groupId,
              optionId: selection.choiceId,
              optionName: choice.name,
              unitPrice: getChoicePrice(choice, selectedPriceOption?.label),
            }),
          );
        },
      );

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
        const body = (await response.json()) as {
          message?: string;
          data?: { itemCount?: number };
        };
        if (!response.ok)
          throw new Error(body.message || "Unable to add item to cart.");
        publishCartUpdated(body.data?.itemCount ?? quantity);
      }

      setFeedback("Item added to cart.");
      if (orderNow) router.push("/cart");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to add item to cart.",
      );
    }
  };

  return (
    <main className="overflow-x-hidden bg-[#FFFDF9] text-[#172536]">
      <section className="border-b border-[#EDE3D8] py-5">
        <div className="mx-auto flex w-[min(100%-2rem,1320px)] items-center gap-3 text-[10px] font-bold text-[#655E57]">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-[#C8102E]"
          >
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
          <MenuItemMediaDetails
            item={item}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

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
                    <FontAwesomeIcon
                      icon={faStar}
                      className="h-3 text-[#E8A53A]"
                    />
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
                        {Math.round(
                          ((selectedPriceOption.compareAtPrice - basePrice) /
                            selectedPriceOption.compareAtPrice) *
                            100,
                        )}
                        % off
                      </span>
                    </>
                  )}
              </div>

              <div className="my-6 h-px bg-[#EDE3D8]" />

              <MenuItemConfiguration
                item={item}
                visibleGroups={visibleGroups}
                selectedPriceOptionId={selectedPriceOptionId}
                selectedPriceOptionLabel={selectedPriceOption?.label}
                selectedOptions={selectedOptions}
                mixedSecondNaanId={mixedSecondNaanId}
                selectedMixedNaanName={selectedMixedNaan?.name}
                mixedNaanPrice={mixedNaanPrice}
                basePrice={basePrice}
                onPriceOptionChange={(id, label) => {
                  setSelectedPriceOptionId(id);
                  if (!isFullPortion(label)) setMixedSecondNaanId("");
                }}
                onChoiceChange={updateChoice}
                onMixedNaanChange={setMixedSecondNaanId}
              />

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
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#E5D9CD]"
                    >
                      <FontAwesomeIcon icon={faMinus} className="h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-black">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.min(20, value + 1))
                      }
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
                <p className="mt-1 text-[7px] leading-3 text-[#655E57]">
                  {text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
