import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiResponse } from "@/lib/types";

const ERROR_STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNSUPPORTED_FILE_TYPE: 415,
  FILE_TOO_LARGE: 413,
  TOO_MANY_PAGES: 413,
  EMPTY_FILE: 400,
  EXTRACTION_FAILED: 422,
  PARSE_FAILED: 422,
  NO_TEXT_FOUND: 422,
  ANALYSIS_FAILED: 422,
  RATE_LIMITED: 429,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number = ERROR_STATUS[code],
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function requestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Wraps a route handler so every unhandled throw becomes a generic INTERNAL
 * ApiError. Never forwards stack traces or error messages to the client — only a
 * request id, which is logged server-side alongside the real error for correlation.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const id = requestId();
      logger.error(`Unhandled error [${id}]`, error);
      return fail("INTERNAL", `Something went wrong on our end (ref: ${id}).`, 500);
    }
  };
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.info(`[info] ${message}`, meta ?? "");
  },
  warn(message: string, meta?: unknown): void {
    console.warn(`[warn] ${message}`, meta ?? "");
  },
  error(message: string, meta?: unknown): void {
    console.error(`[error] ${message}`, meta ?? "");
  },
};
