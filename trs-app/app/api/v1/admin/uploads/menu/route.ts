import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/handleApiError";
import { successResponse } from "@/lib/http/apiResponse";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    if (!user.permissions.includes("menu.create") && !user.permissions.includes("menu.update")) {
      throw new AppError("Permission denied.", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AppError("Select an image to upload.", 400);
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      throw new AppError("Only JPG, PNG, WebP and AVIF images are allowed.", 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      throw new AppError("Image must be smaller than 5 MB.", 400);
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(uploadDirectory, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));

    return successResponse(
      { url: `/uploads/menu/${filename}`, filename },
      "Image uploaded.",
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
