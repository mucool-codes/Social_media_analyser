import { describe, expect, it } from "vitest";
import { buildHeuristicSummary, computeMetrics, heuristicSuggestions } from "@/lib/analyze/heuristics";

describe("computeMetrics", () => {
  it("counts words and characters", () => {
    const metrics = computeMetrics("Hello world, this is a test.");
    expect(metrics.wordCount).toBe(6);
    expect(metrics.charCount).toBe(28);
  });

  it("returns zero word count for empty or whitespace-only text", () => {
    expect(computeMetrics("").wordCount).toBe(0);
    expect(computeMetrics("   \n  ").wordCount).toBe(0);
  });

  it("counts hashtags and mentions with unicode-aware matching", () => {
    const metrics = computeMetrics("Loving this #café update, thanks @josé_a for the tip #2024");
    expect(metrics.hashtagCount).toBe(2);
    expect(metrics.mentionCount).toBe(1);
  });

  it("counts emoji as grapheme clusters, not raw code points", () => {
    // Family emoji (4 people joined by ZWJ) + a flag (2 regional indicators) + a
    // simple emoji should count as 3 emoji, not 7 code points.
    const metrics = computeMetrics("Team trip! 👨‍👩‍👧‍👦🇺🇸😀");
    expect(metrics.emojiCount).toBe(3);
  });

  it("counts links", () => {
    const metrics = computeMetrics("Check this out: https://example.com/post and www.example.org");
    expect(metrics.linkCount).toBe(2);
  });

  it("computes a reading ease score within 0-100", () => {
    const metrics = computeMetrics(
      "This is a simple sentence. It uses short common words. Anyone can read it easily.",
    );
    expect(metrics.readingEase).toBeGreaterThanOrEqual(0);
    expect(metrics.readingEase).toBeLessThanOrEqual(100);
    expect(metrics.readingEase).toBeGreaterThan(50);
  });

  it("does not throw on text with no sentence punctuation", () => {
    const metrics = computeMetrics("just some words with no punctuation at all here");
    expect(metrics.readingEase).toBeGreaterThanOrEqual(0);
    expect(metrics.readingEase).toBeLessThanOrEqual(100);
  });
});

describe("heuristicSuggestions", () => {
  it("flags a post with no call-to-action", () => {
    const text = "Here is an update about our product.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-cta")).toBe(true);
  });

  it("does not flag CTA when the post ends with a question", () => {
    const text = "Have you tried our new feature yet?";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-cta")).toBe(false);
  });

  it("does not flag CTA when a CTA phrase is present", () => {
    const text = "We just shipped a big update. Check out the link in bio for details.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-cta")).toBe(false);
  });

  it("flags missing hashtags", () => {
    const text = "Excited to share our latest project with everyone here today, take a look!";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-hashtags-missing")).toBe(true);
  });

  it("flags too many hashtags", () => {
    const text =
      "Great launch day! #tech #startup #ai #innovation #growth #marketing #business #launch";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-hashtags-excess")).toBe(true);
  });

  it("flags a weak first line hook", () => {
    const text =
      "So I was thinking about writing this post for a while now and finally decided to just sit down and do it today.\nAnyway here are my thoughts.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-weak-hook")).toBe(true);
  });

  it("does not flag a punchy short hook", () => {
    const text = "Big news!\nWe just closed our seed round.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-weak-hook")).toBe(false);
  });

  it("flags a post over the character limit", () => {
    const text = "a".repeat(300);
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-too-long")).toBe(true);
  });

  it("flags all-caps shouting", () => {
    const text = "THIS IS THE BIGGEST ANNOUNCEMENT WE HAVE EVER MADE TODAY";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-all-caps")).toBe(true);
  });

  it("does not flag normal-case text as shouting", () => {
    const text = "This is a normal announcement about our NASA partnership.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-all-caps")).toBe(false);
  });

  it("flags a long post with no line breaks", () => {
    const text = "word ".repeat(60).trim() + ".";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-no-line-breaks")).toBe(true);
  });

  it("does not flag a long post that already has line breaks", () => {
    const text = "word ".repeat(60).trim() + ".\n\nMore text here to close it out.";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-no-line-breaks")).toBe(false);
  });

  it("flags a link with no surrounding context", () => {
    const text = "https://example.com/some-page";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-link-no-context")).toBe(true);
  });

  it("does not flag a link that has context before it", () => {
    const text = "We wrote a full breakdown of how this works, read it here: https://example.com/post";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.some((s) => s.id === "h-link-no-context")).toBe(false);
  });

  it("always returns between 3 and 6 suggestions", () => {
    const texts = [
      "hi",
      "Have you tried our new feature yet? Check it out: https://example.com/feature #new #feature",
      "a".repeat(500),
      "So here's a very long rambling opening line that goes on and on without any punch or urgency and just keeps going before finally getting to the point of the post itself.",
    ];

    for (const text of texts) {
      const suggestions = heuristicSuggestions(text, computeMetrics(text));
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      expect(suggestions.length).toBeLessThanOrEqual(6);
    }
  });

  it("pads a clean post up to the minimum with polish suggestions", () => {
    const text = "Have you tried our new feature yet? Check it out: https://example.com/feature #new";
    const suggestions = heuristicSuggestions(text, computeMetrics(text));
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
  });
});

describe("buildHeuristicSummary", () => {
  it("mentions the suggestion count", () => {
    const metrics = computeMetrics("Hello world");
    const suggestions = heuristicSuggestions("Hello world", metrics);
    const summary = buildHeuristicSummary(metrics, suggestions);
    expect(summary).toContain(String(suggestions.length));
  });
});
