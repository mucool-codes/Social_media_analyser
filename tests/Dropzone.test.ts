import { act, createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dropzone } from "@/components/Dropzone";
import { renderElement, waitFor } from "./testUtils";

const PDF_FILE = new File(["%PDF-1.7 fake"], "post.pdf", { type: "application/pdf" });
const OTHER_PDF_FILE = new File(["%PDF-1.7 fake 2"], "second.pdf", { type: "application/pdf" });
const DOCX_FILE = new File(["fake"], "post.docx", {
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

/** react-dropzone (via file-selector) only needs dt.items shaped like real
 * DataTransferItems for a "drop" event — see file-selector's getDataTransferFiles. */
function fakeDataTransferItem(file: File) {
  return { kind: "file", getAsFile: () => file };
}

function dropFiles(root: Element, files: File[]): void {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { items: files.map(fakeDataTransferItem), files, types: ["Files"] },
  });
  root.dispatchEvent(event);
}

describe("Dropzone", () => {
  it("exposes a keyboard-accessible, labelled control", () => {
    const { container } = renderElement(
      createElement(Dropzone, { onFileSelected: () => {}, onRejected: () => {} }),
    );
    const control = container.querySelector('[role="button"]');
    expect(control).not.toBeNull();
    expect(control?.getAttribute("aria-label")).toMatch(/upload a pdf or image/i);
    expect(control?.getAttribute("tabindex")).toBe("0");
  });

  it("advertises the accepted types and size limit to sighted and screen-reader users", () => {
    const { container } = renderElement(
      createElement(Dropzone, { onFileSelected: () => {}, onRejected: () => {} }),
    );
    expect(container.textContent).toContain("PDF · PNG · JPG · WEBP — max 4 MB");
  });

  it("shows the rejecting (error) styling when tone is 'error'", () => {
    const { container } = renderElement(
      createElement(Dropzone, { onFileSelected: () => {}, onRejected: () => {}, tone: "error" }),
    );
    const control = container.querySelector('[role="button"]');
    expect(control?.className).toContain("border-[#C8402F]");
  });

  it("accepts a single valid PDF dropped onto it", async () => {
    const onFileSelected = vi.fn();
    const onRejected = vi.fn();
    const { container } = renderElement(createElement(Dropzone, { onFileSelected, onRejected }));
    const root = container.querySelector('[role="button"]')!;

    await act(async () => dropFiles(root, [PDF_FILE]));
    await waitFor(() => expect(onFileSelected).toHaveBeenCalledOnce());
    expect(onFileSelected).toHaveBeenCalledWith(PDF_FILE);
    expect(onRejected).not.toHaveBeenCalled();
  });

  it("passes a single invalid file through to onFileSelected so its specific error can be shown", async () => {
    const onFileSelected = vi.fn();
    const onRejected = vi.fn();
    const { container } = renderElement(createElement(Dropzone, { onFileSelected, onRejected }));
    const root = container.querySelector('[role="button"]')!;

    await act(async () => dropFiles(root, [DOCX_FILE]));
    await waitFor(() => expect(onFileSelected).toHaveBeenCalledOnce());
    expect(onFileSelected).toHaveBeenCalledWith(DOCX_FILE);
    expect(onRejected).not.toHaveBeenCalled();
  });

  it("rejects with a clear message instead of silently picking one file when two are dropped at once", async () => {
    const onFileSelected = vi.fn();
    const onRejected = vi.fn();
    const { container } = renderElement(createElement(Dropzone, { onFileSelected, onRejected }));
    const root = container.querySelector('[role="button"]')!;

    await act(async () => dropFiles(root, [PDF_FILE, OTHER_PDF_FILE]));
    await waitFor(() => expect(onRejected).toHaveBeenCalledOnce());
    expect(onRejected).toHaveBeenCalledWith(expect.stringMatching(/one file at a time/i));
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
