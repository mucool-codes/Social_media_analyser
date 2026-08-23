// @vitest-environment node
//
// config.getGeminiApiKey() throws when `window` is defined, as a guard against
// leaking the key into client code. The suite's default jsdom environment defines
// `window` globally, so this file needs the real Node environment to exercise the
// server-only code path — same reason tests/extract/route.test.ts forces it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/lib/analyze/llm";

function geminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  };
}

const VALID_JSON = JSON.stringify({
  summary: "A clear, punchy post with a strong hook.",
  suggestions: [
    { category: "cta", severity: "high", title: "Add a call-to-action", detail: "Tell readers what to do next, e.g. ask them to comment." },
    { category: "hashtags", severity: "medium", title: "Add hashtags", detail: "No hashtags limits discovery beyond your current followers." },
    { category: "hook", severity: "low", title: "Sharpen the opening", detail: "The first line could create more curiosity before the reveal." },
  ],
});

const originalApiKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

describe("analyze", () => {
  it("falls back to heuristics when no API key is set, without calling fetch", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("heuristic-fallback");
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns the Gemini result on a clean successful call", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(VALID_JSON) as unknown as Response);

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("gemini-3.6-flash");
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0]?.title).toBe("Add a call-to-action");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once on malformed JSON and succeeds on the second attempt", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(fetch)
      .mockResolvedValueOnce(geminiResponse("not valid json at all") as unknown as Response)
      .mockResolvedValueOnce(geminiResponse(VALID_JSON) as unknown as Response);

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("gemini-3.6-flash");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to heuristics when both attempts return malformed JSON", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(fetch)
      .mockResolvedValueOnce(geminiResponse("still not json") as unknown as Response)
      .mockResolvedValueOnce(geminiResponse("also not json") as unknown as Response);

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("heuristic-fallback");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("falls back without retrying on a timeout", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("heuristic-fallback");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back without retrying on a 429 rate limit", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) } as unknown as Response);

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("heuristic-fallback");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back without retrying on a generic network error", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.mocked(fetch).mockRejectedValueOnce(new Error("fetch failed"));

    const result = await analyze("Just shipped a new feature, hope you like it.");

    expect(result.model).toBe("heuristic-fallback");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("tops up with heuristic suggestions when Gemini returns fewer than 3", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const sparse = JSON.stringify({
      summary: "Decent post.",
      suggestions: [
        { category: "tone", severity: "low", title: "Minor tone tweak", detail: "Soften the second sentence slightly for warmth." },
      ],
    });
    vi.mocked(fetch).mockResolvedValueOnce(geminiResponse(sparse) as unknown as Response);

    const result = await analyze("hi");

    expect(result.model).toBe("gemini-3.6-flash");
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(result.suggestions[0]?.title).toBe("Minor tone tweak");
  });

  it("always returns metrics computed from the input text", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await analyze("one two three four five");

    expect(result.metrics.wordCount).toBe(5);
  });
});
