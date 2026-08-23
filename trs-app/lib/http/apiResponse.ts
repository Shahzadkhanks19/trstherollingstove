import { NextResponse } from "next/server";

import type {
  ApiErrorDetail,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@/types/api";

export function successResponse<T>(
  data: T,
  message = "Request completed successfully.",
  status = 200,
  meta?: Record<string, unknown>,
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };

  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  errors?: ApiErrorDetail[],
  code?: string,
) {
  const body: ApiErrorResponse = {
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(errors ? { errors } : {}),
  };

  return NextResponse.json(body, { status });
}