"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { isMediumPizzaVariant, thinCrustGroupId } from "@/lib/menu-special-config";
import { MIXED_NAAN_GROUP_ID, MIXED_NAAN_GROUP_NAME, findMixedNaanPrice, isFullPortion } from "@/lib/mixed-naan";
import type { PosCatalogItem, PosConfiguredItem, PosModifierGroup, PosModifierOption, PosVariant } from "@/types/pos";
import { buildSelectedModifiers, createDefaultSelections, selectionHelper, validateModifierSelections, resolveModifierPrice } from "@/components/admin/pos/item-configurator.utils";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function ItemConfigurator({
  item,
  onClose,
  onConfirm,
}: {
  item: PosCatalogItem;
  onClose: () => void;
  onConfirm: (configuration: PosConfiguredItem) => void;
}) {
  const initialVariant =
    item.variants.find((variant) => variant.isDefault && variant.isAvailable) ??
    item.variants.find((variant) => variant.isAvailable) ??
    null;
  const [variantId, setVariantId] = useState(initialVariant?.id ?? null);
  const [selected, setSelected] = useState<
    Record<string, Record<string, number>>
  >(() => createDefaultSelections(item.modifierGroups));
  const [instructions, setInstructions] = useState("");
  const [mixedSecondNaanId, setMixedSecondNaanId] = useState("");
  const [attempted, setAttempted] = useState(false);

  const variant =
    item.variants.find((candidate) => candidate.id === variantId) ??
    initialVariant;
  const syntheticThinCrustGroupId = thinCrustGroupId(item.id);
  const visibleModifierGroups = useMemo(
    () =>
      item.modifierGroups.filter(
        (group) =>
          group.id !== syntheticThinCrustGroupId ||
          isMediumPizzaVariant(variant?.name ?? ""),
      ),
    [item.modifierGroups, syntheticThinCrustGroupId, variant?.name],
  );

  const standardSelectedModifiers = useMemo(
    () =>
      buildSelectedModifiers(
        { ...item, modifierGroups: visibleModifierGroups },
        variant,
        selected,
      ),
    [item, selected, variant, visibleModifierGroups],
  );
  const selectedPlatter = (() => {
    const groupId = item.combinationPricing?.modifierGroupId;
    if (!groupId) return null;
    const optionId = Object.entries(selected[groupId] ?? {}).find(
      ([, count]) => count > 0,
    )?.[0];
    const group = visibleModifierGroups.find(
      (candidate) => candidate.id === groupId,
    );
    const option = group?.options.find(
      (candidate) => candidate.id === optionId,
    );
    return optionId && option ? { id: optionId, name: option.name } : null;
  })();
  const selectedMixedNaan = item.mixedNaanOptions?.find(
    (candidate) => candidate.menuItemId === mixedSecondNaanId,
  );
  const currentPlatterPrice =
    standardSelectedModifiers.find(
      (modifier) =>
        modifier.groupId === item.combinationPricing?.modifierGroupId,
    )?.unitPrice ?? 0;
  const alternatePlatterPrice =
    selectedMixedNaan &&
    selectedPlatter &&
    variant?.name &&
    isFullPortion(variant.name)
      ? findMixedNaanPrice(
          selectedMixedNaan.prices,
          variant.name,
          selectedPlatter.id,
          selectedPlatter.name,
        )
      : null;
  const mixedNaanAdjustment =
    alternatePlatterPrice == null
      ? 0
      : Math.max(0, alternatePlatterPrice - currentPlatterPrice);
  const selectedModifiers = useMemo(
    () => [
      ...standardSelectedModifiers,
      ...(selectedMixedNaan
        ? [
            {
              groupId: MIXED_NAAN_GROUP_ID,
              groupName: MIXED_NAAN_GROUP_NAME,
              optionId: selectedMixedNaan.menuItemId,
              optionName: selectedMixedNaan.name,
              quantity: 1,
              unitPrice: mixedNaanAdjustment,
            },
          ]
        : []),
    ],
    [mixedNaanAdjustment, selectedMixedNaan, standardSelectedModifiers],
  );
  const validationErrors = useMemo(
    () => validateModifierSelections(visibleModifierGroups, selected),
    [visibleModifierGroups, selected],
  );
  // Combination-priced Chur-Chur Naan platters carry the complete meal price
  // on the selected platter option. The Half/Full variant is a pricing key only.
  const basePrice = item.combinationPricing?.enabled
    ? 0
    : (variant?.price ?? item.price);
  const total =
    basePrice +
    selectedModifiers.reduce(
      (sum, modifier) => sum + modifier.unitPrice * modifier.quantity,
      0,
    );

  function selectVariant(nextVariantId: string, nextVariantName: string) {
    setVariantId(nextVariantId);
    if (!isFullPortion(nextVariantName)) setMixedSecondNaanId("");

    if (isMediumPizzaVariant(nextVariantName)) return;

    setSelected((current) => {
      if (!current[syntheticThinCrustGroupId]) return current;
      const next = { ...current };
      delete next[syntheticThinCrustGroupId];
      return next;
    });
  }

  function toggleOption(group: PosModifierGroup, option: PosModifierOption) {
    setSelected((current) => {
      const groupSelection = { ...(current[group.id] ?? {}) };
      if (group.selectionType === "single") {
        return {
          ...current,
          [group.id]: groupSelection[option.id] ? {} : { [option.id]: 1 },
        };
      }

      if (group.selectionType === "quantity") {
        if (groupSelection[option.id]) {
          delete groupSelection[option.id];
        } else {
          groupSelection[option.id] = 1;
        }
        return { ...current, [group.id]: groupSelection };
      }

      if (groupSelection[option.id]) {
        delete groupSelection[option.id];
      } else if (Object.keys(groupSelection).length < group.maxSelections) {
        groupSelection[option.id] = 1;
      }
      return { ...current, [group.id]: groupSelection };
    });
  }

  function changeOptionQuantity(
    group: PosModifierGroup,
    option: PosModifierOption,
    change: number,
  ) {
    setSelected((current) => {
      const groupSelection = { ...(current[group.id] ?? {}) };
      const next = Math.max(
        0,
        Math.min(option.maxQuantity, (groupSelection[option.id] ?? 0) + change),
      );
      if (next === 0) delete groupSelection[option.id];
      else groupSelection[option.id] = next;
      return { ...current, [group.id]: groupSelection };
    });
  }

  function submit() {
    setAttempted(true);
    if (validationErrors.length > 0) return;
    onConfirm({
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      basePrice,
      modifiers: selectedModifiers,
      specialInstructions: instructions.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[130] grid place-items-end bg-black/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close item options"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-item-configurator-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] bg-[#fffdf9] shadow-2xl sm:rounded-[30px]"
      >
        <header className="flex items-start gap-4 border-b border-[#eadfd6] px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#C8102E]">
              Customise item
            </p>
            <h2
              id="pos-item-configurator-title"
              className="mt-1 text-xl font-black tracking-[-.04em] text-[#122b3c]"
            >
              {item.name}
            </h2>
            {item.shortDescription && (
              <p className="mt-1 text-xs font-medium leading-5 text-[#82756c]">
                {item.shortDescription}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3ece5] text-[#122b3c]"
            aria-label="Close item options"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {item.variants.length > 1 && (
            <ConfiguratorSection title="Choose size or variant" required>
              <div className="grid gap-2 sm:grid-cols-2">
                {item.variants
                  .filter((candidate) => candidate.isAvailable)
                  .map((candidate) => (
                    <OptionButton
                      key={candidate.id}
                      active={variant?.id === candidate.id}
                      label={candidate.name}
                      price={candidate.price}
                      hidePrice={Boolean(item.combinationPricing?.enabled)}
                      onClick={() =>
                        selectVariant(candidate.id, candidate.name)
                      }
                    />
                  ))}
              </div>
            </ConfiguratorSection>
          )}

          {visibleModifierGroups.map((group) => {
            const groupSelection = selected[group.id] ?? {};
            const error = attempted
              ? validationErrors.find((entry) => entry.groupId === group.id)
              : undefined;
            return (
              <ConfiguratorSection
                key={group.id}
                title={group.name}
                required={group.required || group.minSelections > 0}
                helper={selectionHelper(group)}
                error={error?.message}
              >
                <div className="space-y-2">
                  {group.options.map((option) => {
                    const quantity = groupSelection[option.id] ?? 0;
                    const optionPrice = resolveModifierPrice(
                      item,
                      group,
                      option,
                      variant,
                    );
                    return (
                      <div
                        key={option.id}
                        className={`rounded-2xl border p-3 transition ${quantity > 0 ? "border-[#C8102E] bg-red-50/50" : "border-[#e7dbd1] bg-white"}`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleOption(group, option)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span
                              className={`grid h-5 w-5 shrink-0 place-items-center border ${group.selectionType === "single" ? "rounded-full" : "rounded-md"} ${quantity > 0 ? "border-[#C8102E] bg-[#C8102E] text-white" : "border-[#cdbfb5] bg-white"}`}
                            >
                              {quantity > 0 ? (
                                <span className="text-[10px] font-black">
                                  ✓
                                </span>
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black text-[#122b3c]">
                                {option.name}
                              </span>
                              <span className="mt-0.5 block text-[10px] font-bold text-[#8b7e75]">
                                {optionPrice > 0
                                  ? `+ ${money.format(optionPrice)}`
                                  : "Included"}
                              </span>
                            </span>
                          </button>

                          {group.selectionType === "quantity" &&
                            quantity > 0 && (
                              <div className="flex items-center rounded-xl bg-[#f3ece5] p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeOptionQuantity(group, option, -1)
                                  }
                                  className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#122b3c]"
                                  aria-label={`Decrease ${option.name}`}
                                >
                                  <FontAwesomeIcon
                                    icon={faMinus}
                                    className="h-2.5"
                                  />
                                </button>
                                <span className="w-8 text-center text-xs font-black text-[#122b3c]">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeOptionQuantity(group, option, 1)
                                  }
                                  disabled={quantity >= option.maxQuantity}
                                  className="grid h-7 w-7 place-items-center rounded-lg bg-[#111820] text-white disabled:opacity-40"
                                  aria-label={`Increase ${option.name}`}
                                >
                                  <FontAwesomeIcon
                                    icon={faPlus}
                                    className="h-2.5"
                                  />
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ConfiguratorSection>
            );
          })}

          {isFullPortion(variant?.name ?? "") &&
            (item.mixedNaanOptions?.length ?? 0) > 0 && (
              <ConfiguratorSection
                title="Choose a different second naan"
                helper={`Optional · Full platter includes two naans · higher platter price applies`}
              >
                <select
                  value={mixedSecondNaanId}
                  onChange={(event) =>
                    setMixedSecondNaanId(event.currentTarget.value)
                  }
                  className="h-12 w-full rounded-2xl border border-[#e5d9cf] bg-white px-4 text-sm font-black text-[#122b3c] outline-none focus:border-[#C8102E]"
                >
                  <option value="">Two {item.name}</option>
                  {item.mixedNaanOptions?.map((option) => (
                    <option key={option.menuItemId} value={option.menuItemId}>
                      1 {item.name} + 1 {option.name}
                    </option>
                  ))}
                </select>
                {selectedMixedNaan && alternatePlatterPrice != null ? (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-900">
                    Mixed Full platter:{" "}
                    {money.format(
                      Math.max(currentPlatterPrice, alternatePlatterPrice),
                    )}
                  </p>
                ) : null}
              </ConfiguratorSection>
            )}

          <ConfiguratorSection title="Special instructions">
            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.currentTarget.value.slice(0, 240))
              }
              rows={3}
              maxLength={240}
              placeholder="Example: less spicy, no onion, pack separately..."
              className="w-full resize-none rounded-2xl border border-[#e5d9cf] bg-white px-4 py-3 text-sm font-semibold text-[#122b3c] outline-none transition placeholder:text-[#aa9e95] focus:border-[#C8102E] focus:ring-4 focus:ring-[#C8102E]/10"
            />
            <p className="mt-1 text-right text-[9px] font-bold text-[#9b8f86]">
              {instructions.length}/240
            </p>
          </ConfiguratorSection>
        </div>

        <footer className="border-t border-[#eadfd6] bg-white px-5 py-4 sm:px-6">
          {attempted && validationErrors.length > 0 && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-[#C8102E]">
              Complete all required selections before adding this item.
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            className="flex h-13 w-full items-center justify-between rounded-2xl bg-[#C8102E] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(200,16,46,.25)]"
          >
            <span>Add to order</span>
            <span>{money.format(total)}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

function ConfiguratorSection({
  title,
  required = false,
  helper,
  error,
  children,
}: {
  title: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#122b3c]">
            {title} {required && <span className="text-[#C8102E]">*</span>}
          </h3>
          {helper && (
            <p className="mt-1 text-[10px] font-semibold text-[#8b7e75]">
              {helper}
            </p>
          )}
        </div>
      </div>
      {children}
      {error && (
        <p className="mt-2 text-[10px] font-black text-[#C8102E]">{error}</p>
      )}
    </section>
  );
}

function OptionButton({
  active,
  label,
  price,
  onClick,
  hidePrice = false,
}: {
  active: boolean;
  label: string;
  price: number;
  onClick: () => void;
  hidePrice?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? "border-[#C8102E] bg-red-50/60" : "border-[#e7dbd1] bg-white"}`}
    >
      <span className="text-sm font-black text-[#122b3c]">{label}</span>
      {!hidePrice && (
        <span className="text-xs font-black text-[#C8102E]">
          {money.format(price)}
        </span>
      )}
    </button>
  );
}

