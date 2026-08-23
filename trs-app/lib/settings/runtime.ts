import { DEFAULT_SETTINGS } from "@/config/defaultSettings";
import { SystemSetting } from "@/models/SystemSetting";
import type {
  SettingPayload,
  SettingSection,
} from "@/types/settings";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  value: SettingPayload;
  expiresAt: number;
};

const cache = new Map<
  SettingSection,
  CacheEntry
>();

export async function getRuntimeSetting(
  section: SettingSection,
) {
  const cached = cache.get(section);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.value;
  }

  const setting = await SystemSetting.findOne(
    { section },
    { data: 1 },
  ).lean();

  const value =
    (setting?.data as SettingPayload | undefined) ??
    DEFAULT_SETTINGS[section].data;

  cache.set(section, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value;
}

export function clearRuntimeSettingCache(
  section?: SettingSection,
) {
  if (section) {
    cache.delete(section);
    return;
  }

  cache.clear();
}
