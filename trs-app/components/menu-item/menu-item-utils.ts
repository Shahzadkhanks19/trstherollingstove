import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faLeaf, faShieldHeart, faStore, faUtensils } from "@fortawesome/free-solid-svg-icons";
import type { MenuOptionGroup } from "@/types/menu";

export type SelectedOptionState = Record<string, Record<string, number>>;

type Tab = "description" | "ingredients" | "nutrition" | "reviews";

type TrustItem = {
  icon: IconDefinition;
  title: string;
  text: string;
};

export const trustItems: TrustItem[] = [
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

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isMongoObjectId(value: string | undefined): value is string {
  return Boolean(value && /^[a-f\d]{24}$/i.test(value));
}

export function canonicalVariantLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("small") || normalized.includes("regular"))
    return "regular";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("large")) return "large";
  if (normalized.includes("half")) return "half";
  if (normalized.includes("full")) return "full";
  return normalized;
}

export function getChoicePrice(
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

export function initialiseOptions(groups: MenuOptionGroup[]): SelectedOptionState {
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

