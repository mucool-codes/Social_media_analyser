import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Dropzone } from "@/components/Dropzone";
import { renderElement } from "./testUtils";

describe("Dropzone", () => {
  it("exposes a keyboard-accessible, labelled control", () => {
    const { container } = renderElement(createElement(Dropzone, { onFileSelected: () => {} }));
    const control = container.querySelector('[role="button"]');
    expect(control).not.toBeNull();
    expect(control?.getAttribute("aria-label")).toMatch(/upload a pdf or image/i);
    expect(control?.getAttribute("tabindex")).toBe("0");
  });

  it("advertises the accepted types and size limit to sighted and screen-reader users", () => {
    const { container } = renderElement(createElement(Dropzone, { onFileSelected: () => {} }));
    expect(container.textContent).toContain("PDF · PNG · JPG · WEBP — max 4 MB");
  });

  it("shows the rejecting (error) styling when tone is 'error'", () => {
    const { container } = renderElement(createElement(Dropzone, { onFileSelected: () => {}, tone: "error" }));
    const control = container.querySelector('[role="button"]');
    expect(control?.className).toContain("border-[#C8402F]");
  });
});
