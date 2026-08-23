import { unlink } from "fs/promises";
import path from "path";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { SiteBanner } from "@/models/SiteBanner";
import { GalleryItem } from "@/models/GalleryItem";
import { MediaAsset } from "@/models/MediaAsset";
import { Testimonial } from "@/models/Testimonial";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("cms.manage"); await connectToDatabase();
    const { id } = await context.params;
    const asset = await MediaAsset.findById(id).lean();
    if (!asset) throw new AppError("Media file not found.", 404);

    const [galleryReference, bannerReference, testimonialReference] = await Promise.all([
      GalleryItem.exists({ $or: [{ mediaUrl: asset.url }, { thumbnailUrl: asset.url }] }),
      SiteBanner.exists({ $or: [{ imageUrl: asset.url }, { mobileImageUrl: asset.url }] }),
      Testimonial.exists({ avatarUrl: asset.url }),
    ]);
    if (galleryReference || bannerReference || testimonialReference) {
      throw new AppError("This media file is currently used by published content. Remove or replace those references first.", 409);
    }

    if (asset.url.startsWith("/uploads/media/")) {
      const relative = asset.url.replace(/^\//, "");
      const absolute = path.resolve(process.cwd(), "public", relative);
      const mediaRoot = path.resolve(process.cwd(), "public", "uploads", "media");
      if (!absolute.startsWith(`${mediaRoot}${path.sep}`)) throw new AppError("Invalid media path.", 400);
      await unlink(absolute).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    await MediaAsset.deleteOne({ _id: asset._id });
    return successResponse(null, "Media file deleted.");
  } catch (error) { return handleApiError(error); }
}
