import { Types } from "mongoose";

import { DEFAULT_SETTINGS } from "@/config/defaultSettings";
import { AppError } from "@/lib/errors/AppError";
import { SystemSetting } from "@/models/SystemSetting";
import { clearRuntimeSettingCache } from "@/lib/settings/runtime";
import { publishRealtimeEventSafely } from "@/services/realtimePublisher.service";
import {
  SETTING_SECTIONS,
  type SettingPayload,
  type SettingSection,
} from "@/types/settings";
import { settingsSchemas } from "@/validators/settings";

const PUBLIC_FIELD_ALLOWLIST: Record<
  SettingSection,
  readonly string[]
> = {
  business: [
    "tradeName",
    "phone",
    "whatsappNumber",
    "email",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "country",
    "postalCode",
    "googleMapsUrl",
    "instagramUrl",
    "facebookUrl",
    "youtubeUrl",
    "timezone",
    "currency",
    "currencySymbol",
  ],
  ordering: [
    "orderingEnabled",
    "dineInEnabled",
    "pickupEnabled",
    "deliveryEnabled",
    "minimumOrderAmount",
    "preparationTimeMinutes",
    "pickupBufferMinutes",
    "openingTime",
    "closingTime",
    "orderSlotIntervalMinutes",
    "storeStatus",
    "acceptingOrders",
    "statusMessage",
    "delayMessage",
    "allowGuestCheckout",
  ],
  loyalty: [
    "loyaltyEnabled",
    "coinsPerHundredRupees",
    "coinValueInRupees",
    "minimumCoinsToRedeem",
    "maximumRedemptionPercent",
    "coinExpiryDays",
    "dailySpinEnabled",
  ],
  taxes: [
    "pricesIncludeTax",
    "defaultTaxRate",
    "serviceChargeEnabled",
    "serviceChargeRate",
  ],
  notifications: [],
  payments: [
    "cashEnabled",
    "upiEnabled",
    "cardEnabled",
    "onlinePaymentEnabled",
  ],
  operations: [
    "maintenanceMode",
    "maintenanceMessage",
  ],
  seo: [
    "siteName",
    "defaultTitle",
    "defaultDescription",
    "defaultKeywords",
    "canonicalBaseUrl",
    "robotsIndexingEnabled",
    "localBusinessSchemaEnabled",
    "googleAnalyticsMeasurementId",
    "metaPixelId",
  ],
  integrations: [],
};

function pickPublicData(
  section: SettingSection,
  data: SettingPayload,
): SettingPayload {
  const allowedFields =
    PUBLIC_FIELD_ALLOWLIST[section];

  return Object.fromEntries(
    allowedFields
      .filter((field) =>
        Object.prototype.hasOwnProperty.call(
          data,
          field,
        ),
      )
      .map((field) => [field, data[field]]),
  );
}

export function validateSettingData(
  section: SettingSection,
  data: SettingPayload,
): SettingPayload {
  const result =
    settingsSchemas[section].safeParse(data);

  if (!result.success) {
    const firstIssue = result.error.issues[0];

    throw new AppError(
      firstIssue?.message ??
        `Invalid ${section} settings.`,
      400,
    );
  }

  return result.data as SettingPayload;
}

function publishSettingsUpdated(section: SettingSection, actorId: string) {
  clearRuntimeSettingCache(section);
  publishRealtimeEventSafely({
    event: "settings.updated",
    actorId,
    data: { section },
    target: { broadcast: true },
  });
}

export async function ensureDefaultSettings(
  actorId: string,
) {
  await Promise.all(
    SETTING_SECTIONS.map((section) => {
      const defaults = DEFAULT_SETTINGS[section];

      return SystemSetting.updateOne(
        {
          section,
        },
        {
          $setOnInsert: {
            section,
            data: defaults.data,
            publicData: defaults.publicData,
            revision: 1,
            updatedBy: new Types.ObjectId(actorId),
          },
        },
        {
          upsert: true,
        },
      );
    }),
  );
}

export async function getSetting(
  section: SettingSection,
) {
  const existing = await SystemSetting.findOne({
    section,
  }).lean();

  if (existing) {
    return {
      ...existing,
      data: {
        ...DEFAULT_SETTINGS[section].data,
        ...(existing.data as SettingPayload),
      },
      publicData: {
        ...DEFAULT_SETTINGS[section].publicData,
        ...(existing.publicData as SettingPayload),
      },
    };
  }

  return {
    section,
    data: DEFAULT_SETTINGS[section].data,
    publicData:
      DEFAULT_SETTINGS[section].publicData,
    revision: 0,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
  };
}

type UpdateSettingInput = {
  section: SettingSection;
  data: SettingPayload;
  expectedRevision?: number;
  actorId: string;
};

export async function updateSetting(
  input: UpdateSettingInput,
) {
  const normalizedData: SettingPayload = {
    ...DEFAULT_SETTINGS[input.section].data,
    ...input.data,
  };

  const validatedData = validateSettingData(
    input.section,
    normalizedData,
  );

  const publicData = pickPublicData(
    input.section,
    validatedData,
  );

  const existing = await SystemSetting.findOne({
    section: input.section,
  });

  if (
    input.expectedRevision !== undefined &&
    (existing?.revision ?? 0) !==
      input.expectedRevision
  ) {
    throw new AppError(
      "Settings were changed by another user. Refresh and try again.",
      409,
    );
  }

  if (!existing) {
    const created = await SystemSetting.create({
      section: input.section,
      data: validatedData,
      publicData,
      revision: 1,
      updatedBy: new Types.ObjectId(
        input.actorId,
      ),
    });
    publishSettingsUpdated(input.section, input.actorId);
    return created;
  }

  existing.data = validatedData;
  existing.publicData = publicData;
  existing.revision += 1;
  existing.updatedBy = new Types.ObjectId(
    input.actorId,
  );

  await existing.save();
  publishSettingsUpdated(input.section, input.actorId);

  return existing;
}

export async function resetSetting(
  section: SettingSection,
  actorId: string,
) {
  const defaults = DEFAULT_SETTINGS[section];

  const setting = await SystemSetting.findOneAndUpdate(
    {
      section,
    },
    {
      $set: {
        data: defaults.data,
        publicData: defaults.publicData,
        updatedBy: new Types.ObjectId(actorId),
      },
      $inc: {
        revision: 1,
      },
      $setOnInsert: {
        section,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  publishSettingsUpdated(section, actorId);
  return setting;
}

export async function getAllPublicSettings() {
  const stored = await SystemSetting.find(
    { section: { $in: SETTING_SECTIONS } },
    {
      section: 1,
      publicData: 1,
      revision: 1,
      updatedAt: 1,
    },
  ).lean();

  const storedMap = new Map(
    stored.map((setting) => [
      setting.section,
      setting,
    ]),
  );

  return Object.fromEntries(
    SETTING_SECTIONS.map((section) => {
      const defaults = DEFAULT_SETTINGS[section];
      const storedSetting =
        storedMap.get(section);

      return [
        section,
        {
          ...(storedSetting?.publicData ??
            defaults.publicData),
          revision:
            storedSetting?.revision ?? 0,
          updatedAt:
            storedSetting?.updatedAt ?? null,
        },
      ];
    }),
  );
}