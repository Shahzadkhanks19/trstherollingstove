export const SETTING_SECTIONS = [
  "business",
  "ordering",
  "loyalty",
  "taxes",
  "notifications",
  "payments",
  "operations",
  "seo",
  "integrations",
] as const;

export type SettingSection =
  (typeof SETTING_SECTIONS)[number];

export type SettingPayload = Record<
  string,
  unknown
>;
