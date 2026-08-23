import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractFromImage } from "@/lib/extract/ocr";

const recognize = vi.fn();
const terminate = vi.fn();
const createWorker = vi.fn();

vi.mock("tesseract.js", () => ({
  createWorker: (...args: unknown[]) => createWorker(...args),
}));

const IMAGE_FILE = new File(["fake-bytes"], "post.png", { type: "image/png" });

beforeEach(() => {
  recognize.mockReset();
  terminate.mockReset();
  createWorker.mockReset();
  createWorker.mockImplementation(async () => ({ recognize, terminate }));
});

describe("extractFromImage", () => {
  it("returns normalized text, confidence and method 'ocr' on a clean recognition", async () => {
    recognize.mockResolvedValue({ data: { text: "Hello   world", confidence: 92 } });

    const doc = await extractFromImage(IMAGE_FILE, vi.fn());

    expect(doc.method).toBe("ocr");
    expect(doc.text).toBe("Hello world");
    expect(doc.meta.meanConfidence).toBe(92);
    expect(doc.pages).toEqual([{ pageNumber: 1, text: "Hello world", confidence: 92 }]);
    expect(doc.warnings).toEqual([]);
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("adds a low-confidence warning below the threshold", async () => {
    recognize.mockResolvedValue({ data: { text: "blurry text", confidence: 40 } });

    const doc = await extractFromImage(IMAGE_FILE, vi.fn());

    expect(doc.warnings).toEqual([
      "Low-confidence scan — results may be inaccurate. A sharper image will help.",
    ]);
  });

  it("maps tesseract's internal status strings to friendly progress labels", async () => {
    recognize.mockImplementation(async () => {
      const logger = createWorker.mock.calls[0]![2].logger;
      logger({ status: "loading tesseract core", progress: 0.1 });
      logger({ status: "recognizing text", progress: 0.5 });
      logger({ status: "some-unmapped-status", progress: 0.9 });
      return { data: { text: "hi", confidence: 90 } };
    });

    const onProgress = vi.fn();
    await extractFromImage(IMAGE_FILE, onProgress);

    expect(onProgress).toHaveBeenCalledWith({ status: "Loading OCR engine", progress: 0.1 });
    expect(onProgress).toHaveBeenCalledWith({ status: "Recognising text", progress: 0.5 });
    expect(onProgress).toHaveBeenCalledWith({ status: "some-unmapped-status", progress: 0.9 });
  });

  it("terminates the worker even when recognition throws, and lets the error propagate", async () => {
    recognize.mockRejectedValue(new Error("tesseract blew up"));

    await expect(extractFromImage(IMAGE_FILE, vi.fn())).rejects.toThrow("tesseract blew up");
    expect(terminate).toHaveBeenCalledOnce();
  });
});
