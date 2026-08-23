import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SystemSetting } from "@/models/SystemSetting";
import "@/models/User";
import { DEFAULT_SETTINGS } from "@/config/defaultSettings";
import { SETTING_SECTIONS } from "@/types/settings";

export async function GET() {
  try {
    await requirePermission("settings.manage");
    await connectToDatabase();

    const stored = await SystemSetting.find({ section: { $in: SETTING_SECTIONS } })
      .populate("updatedBy", "name email")
      .sort({ section: 1 })
      .lean();

    const storedMap = new Map(
      stored.map((setting) => [
        setting.section,
        setting,
      ]),
    );

    const settings = SETTING_SECTIONS.map(
      (section) => {
        const storedSetting = storedMap.get(section);

        if (!storedSetting) {
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

        return {
          ...storedSetting,
          data: {
            ...DEFAULT_SETTINGS[section].data,
            ...(storedSetting.data as Record<string, unknown>),
          },
          publicData: {
            ...DEFAULT_SETTINGS[section].publicData,
            ...(storedSetting.publicData as Record<string, unknown>),
          },
        };
      },
    );

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
