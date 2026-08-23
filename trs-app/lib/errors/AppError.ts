import type { ApiErrorDetail } from "@/types/api";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly errors?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    options?: {
      code?: string;
      errors?: ApiErrorDetail[];
      isOperational?: boolean;
    },
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.errors = options?.errors;
    this.isOperational = options?.isOperational ?? true;

    Error.captureStackTrace(this, this.constructor);
  }
}