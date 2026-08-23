import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { ApiError } from "@/lib/types";
import { click, findByOwnText, renderElement } from "./testUtils";

function setup(error: ApiError) {
  const onChooseAnotherFile = vi.fn();
  const onRetryAnalysis = vi.fn();
  const onDismiss = vi.fn();
  const { container } = renderElement(
    createElement(ErrorBanner, { error, onChooseAnotherFile, onRetryAnalysis, onDismiss }),
  );
  return { container, onChooseAnotherFile, onRetryAnalysis, onDismiss };
}

describe("ErrorBanner", () => {
  it("shows the server's friendly message, not the raw code", () => {
    const { container } = setup({ code: "FILE_TOO_LARGE", message: "That file is 9.4 MB. The limit is 4 MB." });
    expect(findByOwnText(container, "That file is 9.4 MB. The limit is 4 MB.")).not.toBeNull();
    expect(container.textContent).not.toContain("FILE_TOO_LARGE");
  });

  it("falls back to friendly copy when the server sent no message", () => {
    const { container } = setup({ code: "INTERNAL", message: "" });
    expect(findByOwnText(container, "Something went wrong on our end.")).not.toBeNull();
  });

  it("wires the choose-file action for a validation-style error", () => {
    const { container, onChooseAnotherFile, onRetryAnalysis } = setup({
      code: "UNSUPPORTED_FILE_TYPE",
      message: "Nope.",
    });
    const button = findByOwnText(container, "Try another file");
    expect(button).not.toBeNull();
    click(button!);
    expect(onChooseAnotherFile).toHaveBeenCalledOnce();
    expect(onRetryAnalysis).not.toHaveBeenCalled();
  });

  it("wires the retry-analysis action for an analysis-phase error", () => {
    const { container, onRetryAnalysis, onChooseAnotherFile } = setup({
      code: "ANALYSIS_FAILED",
      message: "Model timed out.",
    });
    const button = findByOwnText(container, "Retry analysis");
    expect(button).not.toBeNull();
    click(button!);
    expect(onRetryAnalysis).toHaveBeenCalledOnce();
    expect(onChooseAnotherFile).not.toHaveBeenCalled();
  });

  it("dismiss button always calls onDismiss", () => {
    const { container, onDismiss } = setup({ code: "RATE_LIMITED", message: "Slow down." });
    const dismiss = container.querySelector('[aria-label="Dismiss"]');
    expect(dismiss).not.toBeNull();
    click(dismiss!);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
