import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SuggestionList } from "@/components/SuggestionList";
import type { Suggestion } from "@/lib/types";
import { findByOwnText, renderElement } from "./testUtils";

const SUGGESTIONS: Suggestion[] = [
  { id: "1", category: "length", severity: "low", title: "Low item", detail: "..." },
  { id: "2", category: "hook", severity: "high", title: "High item", detail: "..." },
  { id: "3", category: "hashtags", severity: "medium", title: "Medium item", detail: "..." },
];

const noop = () => {};

const baseProps = {
  onRetryAnalysis: noop,
  onChooseAnotherFile: noop,
  onDismissError: noop,
};

describe("SuggestionList", () => {
  it("sorts suggestions by severity (high, medium, low)", () => {
    const { container } = renderElement(
      createElement(SuggestionList, {
        ...baseProps,
        suggestions: SUGGESTIONS,
        model: "gemini-test",
        analysisError: null,
      }),
    );
    const headings = Array.from(container.querySelectorAll("h3")).map((el) => el.textContent);
    expect(headings).toEqual(["High item", "Medium item", "Low item"]);
  });

  it("shows skeleton placeholders while suggestions is null", () => {
    const { container } = renderElement(
      createElement(SuggestionList, { ...baseProps, suggestions: null, model: null, analysisError: null }),
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector("h3")).toBeNull();
  });

  it("labels a heuristic-fallback model distinctly from a real model name", () => {
    const { container } = renderElement(
      createElement(SuggestionList, {
        ...baseProps,
        suggestions: [],
        model: "heuristic-fallback",
        analysisError: null,
      }),
    );
    expect(container.textContent).toContain("Heuristic fallback");
  });

  it("renders an inline error banner instead of suggestions when analysis failed", () => {
    const onRetryAnalysis = vi.fn();
    const { container } = renderElement(
      createElement(SuggestionList, {
        ...baseProps,
        onRetryAnalysis,
        suggestions: null,
        model: null,
        analysisError: { code: "ANALYSIS_FAILED", message: "The model timed out." },
      }),
    );
    expect(findByOwnText(container, "The model timed out.")).not.toBeNull();
    expect(findByOwnText(container, "Retry analysis")).not.toBeNull();
  });
});
