import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { GalleryItem } from "@/models/GalleryItem";
import { SiteBanner } from "@/models/SiteBanner";
import { Testimonial } from "@/models/Testimonial";

const BANNER_PLACEMENTS = [
  "home_hero",
  "home_offer",
  "menu",
  "checkout",
  "global",
] as const;

type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

function isBannerPlacement(value: string): value is BannerPlacement {
  return BANNER_PLACEMENTS.includes(value as BannerPlacement);
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const requestedPlacement =
      url.searchParams.get("placement") ?? "home_hero";

    const placement: BannerPlacement = isBannerPlacement(
      requestedPlacement,
    )
      ? requestedPlacement
      : "home_hero";

    const now = new Date();

    const [banners, gallery, testimonials] = await Promise.all([
      SiteBanner.find({
        placement,
        isActive: true,
        $and: [
          {
            $or: [
              { startsAt: null },
              { startsAt: { $lte: now } },
            ],
          },
          {
            $or: [
              { endsAt: null },
              { endsAt: { $gte: now } },
            ],
          },
        ],
      })
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .lean(),

      GalleryItem.find({
        isPublished: true,
      })
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .limit(24)
        .lean(),

      Testimonial.find({
        isPublished: true,
      })
        .sort({
          isFeatured: -1,
          sortOrder: 1,
          createdAt: -1,
        })
        .limit(20)
        .lean(),
    ]);

    return successResponse({
      banners,
      gallery,
      testimonials,
    });
  } catch (error) {
    return handleApiError(error);
  }
}