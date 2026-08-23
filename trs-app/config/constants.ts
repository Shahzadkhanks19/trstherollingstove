export const APP_CONFIG = {
  name: "The Rolling Stove",
  shortName: "TRS",
  apiVersion: "v1",
  defaultCurrency: "INR",
  defaultLocale: "en-IN",
  defaultTimeZone: "Asia/Kolkata",
} as const;

export const API_ROUTES = {
  base: "/api/v1",
  health: "/api/v1/health",
} as const;