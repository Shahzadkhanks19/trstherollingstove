export const PAGE_HERO_DEFINITIONS = [
  { pageKey: "home", pageName: "Home", group: "Main" },
  { pageKey: "menu", pageName: "Menu", group: "Main" },
  { pageKey: "offers", pageName: "Offers", group: "Main" },
  { pageKey: "rewards", pageName: "Rewards", group: "Main" },
  { pageKey: "about", pageName: "About", group: "Main" },
  { pageKey: "contact", pageName: "Contact", group: "Main" },
  { pageKey: "gallery", pageName: "Gallery", group: "Main" },
  { pageKey: "track-order", pageName: "Track Order", group: "Ordering" },
  { pageKey: "cart", pageName: "Cart", group: "Ordering" },
  { pageKey: "faq", pageName: "FAQ", group: "Support" },
  { pageKey: "careers", pageName: "Careers", group: "Support" },
  { pageKey: "privacy-policy", pageName: "Privacy Policy", group: "Legal" },
  { pageKey: "terms-and-conditions", pageName: "Terms & Conditions", group: "Legal" },
  { pageKey: "refund-cancellation-policy", pageName: "Refund & Cancellation Policy", group: "Legal" },
  { pageKey: "not-found", pageName: "404 Not Found", group: "System" },
  { pageKey: "error", pageName: "Error", group: "System" },
  { pageKey: "global-error", pageName: "Global Error", group: "System" },
] as const;

export type PageHeroKey = (typeof PAGE_HERO_DEFINITIONS)[number]["pageKey"];

export function getPageHeroDefinition(pageKey: string) {
  return PAGE_HERO_DEFINITIONS.find((item) => item.pageKey === pageKey);
}
