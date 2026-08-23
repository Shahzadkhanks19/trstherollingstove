import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { getPageHeroDefinition } from "@/lib/page-hero-config";
import { PageHero } from "@/models/PageHero";

const routeByKey: Record<string, string> = {
  home: "/", menu: "/menu", offers: "/offers", rewards: "/rewards", about: "/about",
  contact: "/contact", gallery: "/gallery", "track-order": "/track-order", cart: "/cart",
  faq: "/faq", careers: "/careers", "privacy-policy": "/privacy",
  "terms-and-conditions": "/terms", "refund-cancellation-policy": "/refund-policy",
  "not-found": "/not-found", error: "/error", "global-error": "/global-error",
};

function numberInRange(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
}

export async function PATCH(request: Request, context: { params: Promise<{ pageKey: string }> }) {
  try {
    const actor = await requirePermission("cms.manage");
    const { pageKey } = await context.params;
    const definition = getPageHeroDefinition(pageKey);
    if (!definition) throw new AppError("Unknown page hero.", 404);
    const body = await request.json() as Record<string, unknown>;
    await connectToDatabase();
    const hero = await PageHero.findOneAndUpdate(
      { pageKey },
      {
        $set: {
          pageName: definition.pageName,
          desktopImageUrl: String(body.desktopImageUrl || "").trim().slice(0, 1000),
          mobileImageUrl: String(body.mobileImageUrl || "").trim().slice(0, 1000),
          imageAlt: String(body.imageAlt || `${definition.pageName} hero image`).trim().slice(0, 200),
          overlayOpacity: numberInRange(body.overlayOpacity, 58),
          focalPointX: numberInRange(body.focalPointX, 50),
          focalPointY: numberInRange(body.focalPointY, 50),
          isActive: body.isActive !== false,
          updatedBy: actor.id,
        },
        $setOnInsert: { pageKey },
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    revalidatePath(routeByKey[pageKey] || "/", "page");
    return successResponse(hero, `${definition.pageName} hero saved.`);
  } catch (error) {
    return handleApiError(error);
  }
}
