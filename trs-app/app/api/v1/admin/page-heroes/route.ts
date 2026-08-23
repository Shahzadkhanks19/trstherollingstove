import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { PAGE_HERO_DEFINITIONS } from "@/lib/page-hero-config";
import { PageHero } from "@/models/PageHero";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    const saved = await PageHero.find({}).sort({ pageName: 1 }).lean();
    const byKey = new Map(saved.map((item) => [item.pageKey, item]));
    const rows = PAGE_HERO_DEFINITIONS.map((definition) => ({
      ...definition,
      desktopImageUrl: "",
      mobileImageUrl: "",
      imageAlt: `${definition.pageName} hero image`,
      overlayOpacity: 58,
      focalPointX: 50,
      focalPointY: 50,
      isActive: true,
      ...byKey.get(definition.pageKey),
    }));
    return successResponse(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
