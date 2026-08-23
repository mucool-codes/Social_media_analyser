import { describe, expect, it } from "vitest";
import { getErrorPresentation } from "@/lib/client/errorPresentation";
import type { ApiErrorCode } from "@/lib/types";

const ALL_CODES: ApiErrorCode[] = [
  "VALIDATION_ERROR",
  "UNSUPPORTED_FILE_TYPE",
  "FILE_TOO_LARGE",
  "TOO_MANY_PAGES",
  "EMPTY_FILE",
  "EXTRACTION_FAILED",
  "PARSE_FAILED",
  "NO_TEXT_FOUND",
  "ANALYSIS_FAILED",
  "RATE_LIMITED",
  "NOT_IMPLEMENTED",
  "INTERNAL",
];

describe("getErrorPresentation", () => {
  it.each(ALL_CODES)("maps %s to a non-empty title and action label", (code) => {
    const presentation = getErrorPresentation(code);
    expect(presentation.fallbackTitle.length).toBeGreaterThan(0);
    expect(presentation.actionLabel.length).toBeGreaterThan(0);
    expect(["choose-file", "retry-analysis", "dismiss"]).toContain(presentation.action);
  });

  it("only offers retry-analysis for codes that can occur during the analysis phase", () => {
    expect(getErrorPresentation("ANALYSIS_FAILED").action).toBe("retry-analysis");
    expect(getErrorPresentation("RATE_LIMITED").action).toBe("retry-analysis");
    expect(getErrorPresentation("FILE_TOO_LARGE").action).toBe("choose-file");
  });

  it("maps NOT_IMPLEMENTED to a dismissible action", () => {
    expect(getErrorPresentation("NOT_IMPLEMENTED").action).toBe("dismiss");
  });
});
