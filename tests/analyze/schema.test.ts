import { describe, expect, it } from "vitest";
import { parseModelResponse } from "@/lib/analyze/schema";

const VALID_PAYLOAD = {
  summary: "A decent post that could use a stronger hook.",
  suggestions: [
    {
      category: "hook",
      severity: "high",
      title: "Open with a bolder claim",
      detail: "The first line buries the point. Lead with the most surprising fact instead.",
      example: "Most people get this wrong.",
    },
    {
      category: "cta",
      severity: "medium",
      title: "Ask a direct question",
      detail: "End with a specific question so readers know exactly how to respond.",
    },
    {
      category: "hashtags",
      severity: "low",
      title: "Add two or three hashtags",
      detail: "No hashtags means less discovery outside your existing audience.",
    },
  ],
};

describe("parseModelResponse", () => {
  it("parses a clean JSON payload", () => {
    const result = parseModelResponse(JSON.stringify(VALID_PAYLOAD));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toBe(VALID_PAYLOAD.summary);
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0]?.id).toBe("llm-0");
      expect(result.suggestions[0]?.title).toBe("Open with a bolder claim");
    }
  });

  it("parses JSON wrapped in a ```json code fence", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
    const result = parseModelResponse(fenced);
    expect(result.ok).toBe(true);
  });

  it("parses JSON wrapped in a plain code fence", () => {
    const fenced = "```\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
    const result = parseModelResponse(fenced);
    expect(result.ok).toBe(true);
  });

  it("extracts JSON preceded by a prose preamble", () => {
    const withPreamble = `Sure, here's my analysis:\n\n${JSON.stringify(VALID_PAYLOAD)}`;
    const result = parseModelResponse(withPreamble);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.suggestions).toHaveLength(3);
  });

  it("extracts JSON followed by trailing prose", () => {
    const withTrailer = `${JSON.stringify(VALID_PAYLOAD)}\n\nLet me know if you want more detail!`;
    const result = parseModelResponse(withTrailer);
    expect(result.ok).toBe(true);
  });

  it("fails gracefully on truncated JSON", () => {
    const truncated = JSON.stringify(VALID_PAYLOAD).slice(0, 40);
    const result = parseModelResponse(truncated);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBeTruthy();
  });

  it("fails gracefully when there is no JSON object at all", () => {
    const result = parseModelResponse("I couldn't analyse that post, sorry.");
    expect(result.ok).toBe(false);
  });

  it("fails gracefully on a schema mismatch", () => {
    const badShape = JSON.stringify({ summary: "ok", suggestions: [{ category: "bogus" }] });
    const result = parseModelResponse(badShape);
    expect(result.ok).toBe(false);
  });

  it("clamps to a maximum of 6 suggestions", () => {
    const many = {
      summary: "Lots of feedback.",
      suggestions: Array.from({ length: 9 }, (_, i) => ({
        category: "clarity",
        severity: "low",
        title: `Suggestion ${i}`,
        detail: `Detail for suggestion ${i}, explaining why and how to fix it.`,
      })),
    };
    const result = parseModelResponse(JSON.stringify(many));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.suggestions).toHaveLength(6);
  });

  it("truncates an overlong title and detail rather than rejecting the payload", () => {
    const overlong = {
      summary: "ok",
      suggestions: [
        {
          category: "tone",
          severity: "low",
          title: "x".repeat(120),
          detail: "y".repeat(400),
        },
      ],
    };
    const result = parseModelResponse(JSON.stringify(overlong));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions[0]?.title.length).toBeLessThanOrEqual(60);
      expect(result.suggestions[0]?.detail.length).toBeLessThanOrEqual(240);
    }
  });

  it("assigns stable, unique ids in order", () => {
    const result = parseModelResponse(JSON.stringify(VALID_PAYLOAD));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.suggestions.map((s) => s.id)).toEqual(["llm-0", "llm-1", "llm-2"]);
    }
  });
});
