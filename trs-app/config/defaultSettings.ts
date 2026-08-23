import type {
  SettingPayload,
  SettingSection,
} from "@/types/settings";

export type DefaultSetting = {
  data: SettingPayload;
  publicData: SettingPayload;
};

export const DEFAULT_SETTINGS: Record<
  SettingSection,
  DefaultSetting
> = {
  business: {
    data: {
      legalName: "The Rolling Stove",
      tradeName: "TRS",
      phone: "",
      alternatePhone: "",
      whatsappNumber: "",
      email: "",
      gstin: "",
      addressLine1: "",
      addressLine2: "",
      city: "Jodhpur",
      state: "Rajasthan",
      postalCode: "",
      country: "India",
      googleMapsUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      youtubeUrl: "",
      timezone: "Asia/Kolkata",
      currency: "INR",
      currencySymbol: "₹",
    },
    publicData: {
      tradeName: "TRS",
      phone: "",
      whatsappNumber: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "Jodhpur",
      state: "Rajasthan",
      postalCode: "",
      country: "India",
      googleMapsUrl: "",
      instagramUrl: "",
      facebookUrl: "",
      youtubeUrl: "",
      timezone: "Asia/Kolkata",
      currency: "INR",
      currencySymbol: "₹",
    },
  },

  ordering: {
    data: {
      orderingEnabled: true,
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      minimumOrderAmount: 0,
      maximumOrderAmount: 50000,
      preparationTimeMinutes: 15,
      pickupBufferMinutes: 0,
      openingTime: "17:30",
      closingTime: "23:00",
      orderSlotIntervalMinutes: 15,
      storeStatus: "open",
      acceptingOrders: true,
      statusMessage: "Open and accepting online orders.",
      delayMessage:
        "We’re sorry—your order is taking longer than expected due to higher demand.",
      orderCancellationWindowMinutes: 5,
      autoAcceptPaidOrders: false,
      allowGuestCheckout: true,
      requirePhoneVerification: true,
      maxItemsPerOrder: 50,
    },
    publicData: {
      orderingEnabled: true,
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      minimumOrderAmount: 0,
      preparationTimeMinutes: 15,
      pickupBufferMinutes: 0,
      openingTime: "17:30",
      closingTime: "23:00",
      orderSlotIntervalMinutes: 15,
      storeStatus: "open",
      acceptingOrders: true,
      statusMessage: "Open and accepting online orders.",
      delayMessage:
        "We’re sorry—your order is taking longer than expected due to higher demand.",
      allowGuestCheckout: true,
    },
  },

  loyalty: {
    data: {
      loyaltyEnabled: true,
      coinsPerHundredRupees: 5,
      coinValueInRupees: 1,
      minimumCoinsToRedeem: 10,
      maximumRedemptionPercent: 50,
      coinExpiryDays: 365,
      signupBonusCoins: 0,
      birthdayBonusCoins: 0,
      dailySpinEnabled: true,
      dailySpinCooldownHours: 24,
    },
    publicData: {
      loyaltyEnabled: true,
      coinsPerHundredRupees: 5,
      coinValueInRupees: 1,
      minimumCoinsToRedeem: 10,
      maximumRedemptionPercent: 50,
      coinExpiryDays: 365,
      dailySpinEnabled: true,
    },
  },

  taxes: {
    data: {
      pricesIncludeTax: false,
      defaultTaxRate: 5,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
      roundOffEnabled: true,
      roundOffMode: "nearest",
    },
    publicData: {
      pricesIncludeTax: false,
      defaultTaxRate: 5,
      serviceChargeEnabled: false,
      serviceChargeRate: 0,
    },
  },

  notifications: {
    data: {
      emailEnabled: true,
      whatsappEnabled: false,
      smsEnabled: false,
      inAppEnabled: true,
      sendOrderConfirmation: true,
      sendOrderReady: true,
      sendPaymentReceipt: true,
      sendRefundConfirmation: true,
      adminNewOrderAlerts: true,
      adminLowStockAlerts: true,
    },
    publicData: {},
  },

  payments: {
    data: {
      cashEnabled: false,
      upiEnabled: false,
      cardEnabled: false,
      onlinePaymentEnabled: true,
      razorpayEnabled: true,
      paymentTimeoutMinutes: 15,
      allowPartialRefunds: true,
      automaticRefundsEnabled: false,
      refundProcessingDays: 5,
    },
    publicData: {
      cashEnabled: false,
      upiEnabled: false,
      cardEnabled: false,
      onlinePaymentEnabled: true,
    },
  },

  operations: {
    data: {
      maintenanceMode: false,
      maintenanceMessage:
        "We are temporarily unavailable. Please try again shortly.",
      kitchenDisplayEnabled: true,
      inventoryDeductionEnabled: true,
      negativeStockAllowed: false,
      lowStockNotificationEnabled: true,
      lowStockCheckIntervalMinutes: 60,
      posEnabled: true,
      requireOpenPosShift: true,
      businessDayClosingHour: 3,
    },
    publicData: {
      maintenanceMode: false,
      maintenanceMessage:
        "We are temporarily unavailable. Please try again shortly.",
    },
  },

  seo: {
    data: {
      siteName: "The Rolling Stove",
      defaultTitle:
        "The Rolling Stove | Vegetarian Food in Jodhpur",
      defaultDescription: "",
      defaultKeywords: [],
      canonicalBaseUrl: "",
      googleSiteVerification: "",
      robotsIndexingEnabled: true,
      localBusinessSchemaEnabled: true,
      googleAnalyticsMeasurementId: "",
      metaPixelId: "",
    },
    publicData: {
      siteName: "The Rolling Stove",
      defaultTitle:
        "The Rolling Stove | Vegetarian Food in Jodhpur",
      defaultDescription: "",
      defaultKeywords: [],
      canonicalBaseUrl: "",
      robotsIndexingEnabled: true,
      localBusinessSchemaEnabled: true,
      googleAnalyticsMeasurementId: "",
      metaPixelId: "",
    },
  },

  integrations: {
    data: {
      razorpayConfigured: false,
      emailConfigured: false,
      whatsappConfigured: false,
      googleMapsConfigured: false,
      googleAnalyticsConfigured: false,
      socketConfigured: false,
      biometricConfigured: false,
      swiggyConfigured: false,
      zomatoConfigured: false,
    },
    publicData: {},
  },
};
