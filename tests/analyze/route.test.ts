// @vitest-environment node
//
// The route calls analyze() -> getGeminiApiKey(), which throws under jsdom (see
// llm.test.ts) since that environment defines `window` globally. Force the real
// Node environment to match production.
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/analyze/route";
import type { AnalysisResult, ApiResponse } from "@/lib/types";

function requestFrom(ip: string, text: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ text }),
  });
}

const originalApiKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

describe("POST /api/analyze", () => {
  it("analyses valid text end-to-end using the heuristic fallback (no API key)", async () => {
    const res = await POST(requestFrom("1.1.1.1", "Just shipped a new feature, check it out!"));
    const body = (await res.json()) as ApiResponse<AnalysisResult>;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.data.model).toBe("heuristic-fallback");
      expect(body.data.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(body.data.suggestions.length).toBeLessThanOrEqual(6);
      expect(body.data.metrics.wordCount).toBeGreaterThan(0);
    }
  });

  it("rejects empty text", async () => {
    const res = await POST(requestFrom("1.1.1.2", "   "));
    const body = (await res.json()) as ApiResponse<AnalysisResult>;

    expect(res.status).toBe(400);
    if (!body.ok) expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-string text field", async () => {
    const res = await POST(requestFrom("1.1.1.3", 12345));
    const body = (await res.json()) as ApiResponse<AnalysisResult>;

    expect(res.status).toBe(400);
    if (!body.ok) expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects text over the max length", async () => {
    const res = await POST(requestFrom("1.1.1.4", "a".repeat(20_001)));
    const body = (await res.json()) as ApiResponse<AnalysisResult>;

    expect(res.status).toBe(400);
    if (!body.ok) expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rate-limits a single IP after 10 requests within a minute", async () => {
    const ip = "9.9.9.9";
    for (let i = 0; i < 10; i++) {
      const res = await POST(requestFrom(ip, "A short valid post."));
      expect(res.status).toBe(200);
    }

    const res = await POST(requestFrom(ip, "A short valid post."));
    const body = (await res.json()) as ApiResponse<AnalysisResult>;

    expect(res.status).toBe(429);
    if (!body.ok) expect(body.error.code).toBe("RATE_LIMITED");
  });
});
