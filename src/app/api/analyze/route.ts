import type { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyze/llm";
import { fail, ok, withErrorHandling } from "@/lib/http";
import type { AnalysisResult, AnalyzeRequestBody, ApiResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * In-memory per-IP limiter. Resets on cold start / redeploy and doesn't share state
 * across serverless instances — acceptable for this project's scale, but it would
 * need a shared store (e.g. Redis) to hold under real multi-instance traffic.
 */
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

function clientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return (forwardedFor.split(",")[0] ?? forwardedFor).trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export const POST = withErrorHandling(
  async (req: NextRequest): Promise<NextResponse<ApiResponse<AnalysisResult>>> => {
    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      return fail("RATE_LIMITED", "Too many analysis requests — please wait a minute and try again.");
    }

    let body: AnalyzeRequestBody;
    try {
      body = (await req.json()) as AnalyzeRequestBody;
    } catch {
      return fail("VALIDATION_ERROR", "Expected a JSON body with a \"text\" field.");
    }

    if (typeof body.text !== "string") {
      return fail("VALIDATION_ERROR", "Expected a JSON body with a \"text\" field.");
    }

    const text = body.text.trim();
    if (text.length === 0) {
      return fail("VALIDATION_ERROR", "There's no text to analyse.");
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return fail(
        "VALIDATION_ERROR",
        `That post is too long to analyse — please keep it under ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
      );
    }

    const result = await analyze(text);
    return ok(result);
  },
);
