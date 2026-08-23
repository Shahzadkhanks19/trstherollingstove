import type { MenuItemDetails, MenuOptionGroup } from "@/types/menu";

const CUSTOMER_ALLOWED_GROUPS = new Set<MenuOptionGroup["code"]>([
  "crust",
  "size",
  "portion",
  "cooking_instruction",
  "spice_level",
  "seasoning",
  "sweetness",
  "ice_preference",
  "extra_cheese",
  "extra_toppings",
  "dips",
  "extra_naan",
  "sabji_choice",
  "other",
]);

const POS_ONLY_OPTION_CODES = new Set([
  "extra_raita",
  "extra_dal_makhani",
  "extra_chole",
  "extra_paneer_sabji",
  "extra_sabji",
]);

export function getCustomerVisibleOptionGroups(
  item: MenuItemDetails,
): MenuOptionGroup[] {
  return item.optionGroups
    .filter((group) => {
      if (POS_ONLY_OPTION_CODES.has(group.code)) return false;
      return CUSTOMER_ALLOWED_GROUPS.has(group.code);
    })
    .map((group) => {
      const categoryIdentity = `${item.category.slug} ${item.category.name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ");
      const isChurChurNaan =
        categoryIdentity.includes("chur") && categoryIdentity.includes("naan");

      if (!isChurChurNaan) return group;

      const isConfiguredPlatterGroup =
        Boolean(item.combinationPricing?.enabled) &&
        item.combinationPricing?.modifierGroupId === group.id;

      if (
        !isConfiguredPlatterGroup &&
        !["portion", "sabji_choice", "extra_naan"].includes(group.code)
      ) {
        return { ...group, choices: [] };
      }
      return {
        ...group,
        choices: group.choices.filter((choice) => !choice.name.toLowerCase().includes("jain")),
      };
    })
    .filter((group) => group.choices.length > 0);
}

export function getCategoryGuidance(categorySlug: string): string[] {
  switch (categorySlug) {
    case "pizzas":
      return [
        "Small, Medium and Large sizes",
        "Thin crust on Medium only where enabled",
        "Extra cheese, toppings and dips",
        "Frequently ordered side items",
      ];
    case "garlic-breads":
      return [
        "Portion or variant where available",
        "Cooking instruction, cheese and dips",
        "Frequently ordered side items",
      ];
    case "chur-chur-naan":
      return [
        "Choose half or full plate",
        "Choose Dal Makhani + Raita + Chole or Dal Makhani + Raita + Paneer",
        "Full platters may contain two different naans; the higher platter price applies",
        "Add extra naans where required",
      ];
    case "pastas":
      return [
        "Sauce or portion where configured",
        "Spice level and extra cheese",
        "Garlic bread or mocktail suggestions",
      ];
    case "fries":
      return [
        "Size where configured",
        "Seasoning or flavour",
        "Dips and extra cheese where supported",
      ];
    case "brownies":
      return [
        "Regular, with ice cream or sizzling variants where configured",
      ];
    case "mocktails":
      return [
        "Size, sweetness and ice preference where configured",
      ];
    default:
      return ["Available customisations are controlled from the admin dashboard"];
  }
}
