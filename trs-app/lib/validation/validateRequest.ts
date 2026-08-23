import type { ZodType } from "zod";

import { AppError } from "@/lib/errors/AppError";

const DEFAULT_MAX_JSON_BYTES = 1_000_000;

export async function validateRequestBody<T>(
  request: Request,
  schema: ZodType<T>,
  options?: { maxBytes?: number },
): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    throw new AppError("Content-Type must be application/json.", 415, {
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_JSON_BYTES;
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new AppError("Request body is too large.", 413, {
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new AppError("Request body must contain valid JSON.", 400, {
      code: "INVALID_JSON",
    });
  }

  return schema.parse(body);
}
