"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
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
  getCustomerVisibleOptionGroups,
} from "@/lib/menu-option-rules";
import {
  MIXED_NAAN_GROUP_ID,
  findMixedNaanPrice,
  isFullPortion,
} from "@/lib/mixed-naan";

import {
  canonicalVariantLabel,
  getChoicePrice,
  initialiseOptions,
  isMongoObjectId,
  type SelectedOptionState,
  type Tab,
} from "@/components/menu-item/menu-item-utils";
import { MenuItemMediaDetails } from "@/components/menu-item/MenuItemMediaDetails";
import { MenuItemConfiguration } from "@/components/menu-item/MenuItemConfiguration";
import { MenuItemOrderActions } from "@/components/menu-item/MenuItemOrderActions";
import { MenuItemCategoryGuidance, MenuItemSummary, MenuItemTrustStrip } from "@/components/menu-item/MenuItemSupportingUi";

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
              <MenuItemSummary
                item={item}
                basePrice={basePrice}
                compareAtPrice={selectedPriceOption?.compareAtPrice}
              />

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

              <MenuItemOrderActions
                item={item}
                specialInstructions={specialInstructions}
                hasExtraToppingSelected={hasExtraToppingSelected}
                basePrice={basePrice}
                optionTotal={optionTotal}
                total={total}
                quantity={quantity}
                feedback={feedback}
                onInstructionsChange={setSpecialInstructions}
                onQuantityChange={setQuantity}
                onAddToCart={(orderNow) => void addToCart(orderNow)}
              />
            </section>

            <MenuItemCategoryGuidance categorySlug={item.category.slug} />
          </aside>
        </div>
      </section>

      <MenuItemTrustStrip />
    </main>
  );
}
