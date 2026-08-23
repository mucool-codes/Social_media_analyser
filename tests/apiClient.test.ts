import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeText, extractPdf } from "@/lib/client/apiClient";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const PDF_FILE = new File(["%PDF-1.7 fake"], "post.pdf", { type: "application/pdf" });

describe("apiClient", () => {
  it("extractPdf returns a friendly network error when fetch rejects (connection dropped)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await extractPdf(PDF_FILE);

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Couldn't reach the server. Check your connection and try again." },
    });
  });

  it("analyzeText returns a friendly network error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await analyzeText("hello");

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Couldn't reach the server. Check your connection and try again." },
    });
  });

  it("returns a friendly error instead of throwing when the server sends unparsable JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
      }),
    );

    const result = await analyzeText("hello");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).toMatch(/couldn't read/i);
    }
  });

  it("passes through a well-formed ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true, data: { foo: "bar" } }),
      }),
    );

    const result = await analyzeText("hello");
    expect(result).toEqual({ ok: true, data: { foo: "bar" } });
  });
});
