import { ZodError } from "zod";

import { AppError } from "@/lib/errors/AppError";
import { errorResponse } from "@/lib/http/apiResponse";
import type { ApiErrorDetail } from "@/types/api";

type MongoLikeError = {
  name?: string;
  code?: number;
  path?: string;
  value?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<
    string,
    {
      message?: string;
      path?: string;
      kind?: string;
      value?: unknown;
    }
  >;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asMongoError(error: unknown): MongoLikeError | null {
  return isRecord(error) ? (error as MongoLikeError) : null;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return errorResponse("Validation failed.", 422, errors, "VALIDATION_ERROR");
  }

  if (error instanceof AppError) {
    return errorResponse(
      error.message,
      error.statusCode,
      error.errors,
      error.code,
    );
  }

  const mongoError = asMongoError(error);

  if (mongoError?.name === "CastError" || mongoError?.name === "BSONError") {
    const field = mongoError.path || "id";

    return errorResponse(
      "Invalid identifier.",
      400,
      [
        {
          field,
          path: field,
          value: mongoError.value,
          message: `The ${field} value is invalid.`,
          code: "INVALID_IDENTIFIER",
        },
      ],
      "INVALID_IDENTIFIER",
    );
  }

  if (mongoError?.name === "ValidationError" && mongoError.errors) {
    const errors: ApiErrorDetail[] = Object.entries(mongoError.errors).map(
      ([field, detail]) => ({
        field: detail.path || field,
        path: detail.path || field,
        value: detail.value,
        message: detail.message || `The ${field} value is invalid.`,
        code: detail.kind || "MONGOOSE_VALIDATION_ERROR",
      }),
    );

    return errorResponse(
      "Validation failed.",
      422,
      errors,
      "VALIDATION_ERROR",
    );
  }

  if (mongoError?.code === 11000) {
    const duplicateFields = Object.entries(mongoError.keyValue ?? {});
    const errors: ApiErrorDetail[] = duplicateFields.map(([field, value]) => ({
      field,
      path: field,
      value,
      message: `A record with this ${field} already exists.`,
      code: "DUPLICATE_VALUE",
    }));

    return errorResponse(
      duplicateFields.length === 1
        ? (errors[0]?.message ?? "A duplicate value already exists.")
        : "A record with these details already exists.",
      409,
      errors.length > 0 ? errors : undefined,
      "DUPLICATE_VALUE",
    );
  }

  console.error("Unhandled API error:", error);

  return errorResponse(
    "An unexpected server error occurred.",
    500,
    undefined,
    "INTERNAL_SERVER_ERROR",
  );
}
