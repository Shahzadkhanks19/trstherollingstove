import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { requirePermission } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";
import { MediaAsset } from "@/models/MediaAsset";

export const runtime = "nodejs";

const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const ALLOWED: Record<string, { extension: string; mediaType: "image" | "video" }> = {
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/png": { extension: "png", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "image/avif": { extension: "avif", mediaType: "image" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
};

function cleanCategory(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "general";
  return (raw || "general").replace(/[^a-z0-9-_]/g, "-").slice(0, 80);
}

export async function GET(request: Request) {
  try {
    await requirePermission("cms.read");
    await connectToDatabase();
    const url = new URL(request.url);
    const mediaType = url.searchParams.get("mediaType");
    const query = url.searchParams.get("q")?.trim();
    const filter: Record<string, unknown> = {};
    if (mediaType === "image" || mediaType === "video") filter.mediaType = mediaType;
    if (query) filter.$text = { $search: query };
    const assets = await MediaAsset.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return successResponse(assets);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("cms.manage");
    const formData = await request.formData();
    const files = formData.getAll("files");
    if (!files.length || files.some((file) => !(file instanceof File))) {
      throw new AppError("Select one or more files to upload.", 400);
    }

    const category = cleanCategory(formData.get("category"));
    const altText = String(formData.get("altText") || "").trim().slice(0, 200);
    const directory = path.join(process.cwd(), "public", "uploads", "media", category);
    await mkdir(directory, { recursive: true });
    await connectToDatabase();

    const created = [];
    for (const entry of files) {
      const file = entry as File;
      const config = ALLOWED[file.type];
      if (!config) throw new AppError("Only JPG, PNG, WebP, AVIF, MP4 and WebM files are allowed.", 400);
      const max = config.mediaType === "image" ? IMAGE_MAX : VIDEO_MAX;
      if (file.size === 0 || file.size > max) {
        throw new AppError(config.mediaType === "image" ? "Each image must be smaller than 8 MB." : "Each video must be smaller than 50 MB.", 400);
      }
      const filename = `${Date.now()}-${randomUUID()}.${config.extension}`;
      const relativeUrl = `/uploads/media/${category}/${filename}`;
      await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
      created.push(await MediaAsset.create({
        filename,
        originalName: file.name,
        url: relativeUrl,
        mediaType: config.mediaType,
        mimeType: file.type,
        sizeBytes: file.size,
        category,
        altText,
        createdBy: actor.id,
      }));
    }
    return successResponse(created, `${created.length} media file${created.length === 1 ? "" : "s"} uploaded.`, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
