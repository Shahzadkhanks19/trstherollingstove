import { z } from "zod";

import { SETTING_SECTIONS } from "@/types/settings";

const phoneSchema = z
  .string()
  .trim()
  .max(20);

const optionalEmailSchema = z.union([
  z.email(),
  z.literal(""),
]);

export const settingSectionSchema =
  z.enum(SETTING_SECTIONS);

export const updateSettingRequestSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  expectedRevision: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export const businessSettingsSchema = z.object({
  legalName: z.string().trim().min(2).max(180),
  tradeName: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  whatsappNumber: phoneSchema,
  email: optionalEmailSchema,
  gstin: z.string().trim().max(20),
  addressLine1: z.string().trim().max(240),
  addressLine2: z.string().trim().max(240),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().max(100),
  googleMapsUrl: z.union([z.url(), z.literal("")]),
  instagramUrl: z.union([z.url(), z.literal("")]),
  facebookUrl: z.union([z.url(), z.literal("")]),
  youtubeUrl: z.union([z.url(), z.literal("")]),
  timezone: z.string().trim().min(1).max(100),
  currency: z.string().trim().length(3),
  currencySymbol: z.string().trim().min(1).max(5),
});

export const orderingSettingsSchema = z.object({
  orderingEnabled: z.boolean(),
  dineInEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryEnabled: z.literal(false),
  minimumOrderAmount: z.number().min(0),
  maximumOrderAmount: z.number().positive(),
  preparationTimeMinutes: z.number().int().min(1).max(240),
  pickupBufferMinutes: z.number().int().min(0).max(240),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  orderSlotIntervalMinutes: z.number().int().min(5).max(120),
  storeStatus: z.enum([
    "open",
    "busy",
    "closed",
    "not_accepting_orders",
  ]),
  acceptingOrders: z.boolean(),
  statusMessage: z.string().trim().min(3).max(300),
  delayMessage: z.string().trim().min(3).max(300),
  orderCancellationWindowMinutes:
    z.number().int().min(0).max(240),
  autoAcceptPaidOrders: z.boolean(),
  allowGuestCheckout: z.boolean(),
  requirePhoneVerification: z.boolean(),
  maxItemsPerOrder: z.number().int().min(1).max(200),
}).superRefine((value, ctx) => {
  if (
    value.maximumOrderAmount <
    value.minimumOrderAmount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maximumOrderAmount"],
      message:
        "Maximum order amount cannot be below the minimum order amount.",
    });
  }

  if (
    value.orderingEnabled &&
    !value.dineInEnabled &&
    !value.pickupEnabled
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["orderingEnabled"],
      message:
        "At least one supported fulfilment type must be enabled.",
    });
  }
});

export const loyaltySettingsSchema = z.object({
  loyaltyEnabled: z.boolean(),
  coinsPerHundredRupees: z.number().min(0).max(10000),
  coinValueInRupees: z.number().positive().max(1000),
  minimumCoinsToRedeem: z.number().int().min(0),
  maximumRedemptionPercent:
    z.number().min(0).max(100),
  coinExpiryDays: z.number().int().min(1).max(3650),
  signupBonusCoins: z.number().int().min(0),
  birthdayBonusCoins: z.number().int().min(0),
  dailySpinEnabled: z.boolean(),
  dailySpinCooldownHours:
    z.number().int().min(1).max(720),
});

export const taxSettingsSchema = z.object({
  pricesIncludeTax: z.boolean(),
  defaultTaxRate: z.number().min(0).max(100),
  serviceChargeEnabled: z.boolean(),
  serviceChargeRate: z.number().min(0).max(100),
  roundOffEnabled: z.boolean(),
  roundOffMode: z.enum([
    "nearest",
    "up",
    "down",
  ]),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  sendOrderConfirmation: z.boolean(),
  sendOrderReady: z.boolean(),
  sendPaymentReceipt: z.boolean(),
  sendRefundConfirmation: z.boolean(),
  adminNewOrderAlerts: z.boolean(),
  adminLowStockAlerts: z.boolean(),
});

export const paymentSettingsSchema = z.object({
  cashEnabled: z.boolean(),
  upiEnabled: z.boolean(),
  cardEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
  razorpayEnabled: z.boolean(),
  paymentTimeoutMinutes:
    z.number().int().min(1).max(1440),
  allowPartialRefunds: z.boolean(),
  automaticRefundsEnabled: z.boolean(),
  refundProcessingDays:
    z.number().int().min(0).max(90),
}).superRefine((value, ctx) => {
  if (
    !value.cashEnabled &&
    !value.upiEnabled &&
    !value.cardEnabled &&
    !value.onlinePaymentEnabled
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cashEnabled"],
      message:
        "At least one payment method must remain enabled.",
    });
  }

  if (
    value.razorpayEnabled &&
    !value.onlinePaymentEnabled
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["razorpayEnabled"],
      message:
        "Online payment must be enabled when Razorpay is enabled.",
    });
  }
});

export const operationsSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage:
    z.string().trim().min(3).max(500),
  kitchenDisplayEnabled: z.boolean(),
  inventoryDeductionEnabled: z.boolean(),
  negativeStockAllowed: z.literal(false),
  lowStockNotificationEnabled: z.boolean(),
  lowStockCheckIntervalMinutes:
    z.number().int().min(5).max(1440),
  posEnabled: z.boolean(),
  requireOpenPosShift: z.boolean(),
  businessDayClosingHour:
    z.number().int().min(0).max(23),
});

export const seoSettingsSchema = z.object({
  siteName: z.string().trim().min(2).max(120),
  defaultTitle: z.string().trim().min(5).max(120),
  defaultDescription: z.string().trim().max(320),
  defaultKeywords:
    z.array(z.string().trim().min(1).max(80)).max(100),
  canonicalBaseUrl: z.union([
    z.url(),
    z.literal(""),
  ]),
  googleSiteVerification:
    z.string().trim().max(250),
  robotsIndexingEnabled: z.boolean(),
  localBusinessSchemaEnabled: z.boolean(),
  googleAnalyticsMeasurementId:
    z.string().trim().max(50),
  metaPixelId: z.string().trim().max(50),
});

export const integrationSettingsSchema = z.object({
  razorpayConfigured: z.boolean(),
  emailConfigured: z.boolean(),
  whatsappConfigured: z.boolean(),
  googleMapsConfigured: z.boolean(),
  googleAnalyticsConfigured: z.boolean(),
  socketConfigured: z.boolean(),
  biometricConfigured: z.boolean(),
  swiggyConfigured: z.boolean(),
  zomatoConfigured: z.boolean(),
});

export const settingsSchemas = {
  business: businessSettingsSchema,
  ordering: orderingSettingsSchema,
  loyalty: loyaltySettingsSchema,
  taxes: taxSettingsSchema,
  notifications: notificationSettingsSchema,
  payments: paymentSettingsSchema,
  operations: operationsSettingsSchema,
  seo: seoSettingsSchema,
  integrations: integrationSettingsSchema,
} as const;
