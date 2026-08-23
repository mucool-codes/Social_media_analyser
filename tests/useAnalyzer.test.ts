import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalyzer } from "@/lib/client/useAnalyzer";
import * as apiClient from "@/lib/client/apiClient";
import * as ocr from "@/lib/extract/ocr";
import type { AnalysisResult, ExtractedDoc } from "@/lib/types";
import { renderHook, waitFor } from "./testUtils";

const PDF_FILE = new File(["%PDF-1.7 fake"], "post.pdf", { type: "application/pdf" });
const IMAGE_FILE = new File(["fake-bytes"], "post.png", { type: "image/png" });

const DOC: ExtractedDoc = {
  meta: { fileName: "post.pdf", fileType: "application/pdf", sizeBytes: 1024, pageCount: 1, durationMs: 120 },
  text: "Hello world",
  pages: [{ pageNumber: 1, text: "Hello world" }],
  method: "pdf-parse",
  warnings: [],
};

const RESULT: AnalysisResult = {
  summary: "Looks fine.",
  metrics: {
    wordCount: 2,
    charCount: 11,
    hashtagCount: 0,
    mentionCount: 0,
    emojiCount: 0,
    linkCount: 0,
    readingEase: 80,
  },
  suggestions: [],
  model: "gemini-test",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAnalyzer", () => {
  it("rejects an oversized file without calling the extraction API", () => {
    const extractPdfSpy = vi.spyOn(apiClient, "extractPdf");
    const { result } = renderHook(() => useAnalyzer());

    const hugeFile = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(hugeFile, "size", { value: 5 * 1024 * 1024 });

    act(() => {
      result.current.selectFile(hugeFile);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorPhase).toBe("validation");
    expect(result.current.error?.code).toBe("FILE_TOO_LARGE");
    expect(extractPdfSpy).not.toHaveBeenCalled();
  });

  it("chains extraction then analysis to 'done' on success", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({ ok: true, data: DOC });
    vi.spyOn(apiClient, "analyzeText").mockResolvedValue({ ok: true, data: RESULT });

    const { result } = renderHook(() => useAnalyzer());

    act(() => {
      result.current.selectFile(PDF_FILE);
    });

    expect(result.current.status).toBe("extracting");

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(result.current.doc).toEqual(DOC);
    expect(result.current.result).toEqual(RESULT);
    expect(result.current.error).toBeNull();
  });

  it("keeps the extracted doc when analysis fails, so the text is still shown", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({ ok: true, data: DOC });
    vi.spyOn(apiClient, "analyzeText").mockResolvedValue({
      ok: false,
      error: { code: "ANALYSIS_FAILED", message: "The model timed out." },
    });

    const { result } = renderHook(() => useAnalyzer());

    act(() => {
      result.current.selectFile(PDF_FILE);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorPhase).toBe("analysis");
    expect(result.current.doc).toEqual(DOC);
  });

  it("surfaces an extraction failure and clears the doc", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({
      ok: false,
      error: { code: "PARSE_FAILED", message: "Couldn't read that PDF." },
    });
    const analyzeSpy = vi.spyOn(apiClient, "analyzeText");

    const { result } = renderHook(() => useAnalyzer());

    act(() => {
      result.current.selectFile(PDF_FILE);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorPhase).toBe("extraction");
    expect(result.current.doc).toBeNull();
    expect(analyzeSpy).not.toHaveBeenCalled();
  });

  it("routes image files through extractFromImage instead of the PDF API", async () => {
    const ocrSpy = vi.spyOn(ocr, "extractFromImage").mockResolvedValue({
      ...DOC,
      meta: { ...DOC.meta, fileName: "post.png", fileType: "image/png" },
      method: "ocr",
    });
    vi.spyOn(apiClient, "analyzeText").mockResolvedValue({ ok: true, data: RESULT });
    const extractPdfSpy = vi.spyOn(apiClient, "extractPdf");

    const { result } = renderHook(() => useAnalyzer());

    act(() => {
      result.current.selectFile(IMAGE_FILE);
    });

    await waitFor(() => expect(result.current.status).toBe("done"), { timeout: 3000 });
    expect(ocrSpy).toHaveBeenCalledOnce();
    expect(extractPdfSpy).not.toHaveBeenCalled();
  });

  it("dismissing an analysis error returns to 'extracted' and keeps the doc", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({ ok: true, data: DOC });
    vi.spyOn(apiClient, "analyzeText").mockResolvedValue({
      ok: false,
      error: { code: "ANALYSIS_FAILED", message: "The model timed out." },
    });

    const { result } = renderHook(() => useAnalyzer());
    act(() => result.current.selectFile(PDF_FILE));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.dismissError());

    expect(result.current.status).toBe("extracted");
    expect(result.current.doc).toEqual(DOC);
    expect(result.current.error).toBeNull();
  });

  it("retryAnalysis re-runs analysis on the existing doc", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({ ok: true, data: DOC });
    const analyzeSpy = vi
      .spyOn(apiClient, "analyzeText")
      .mockResolvedValueOnce({ ok: false, error: { code: "ANALYSIS_FAILED", message: "nope" } })
      .mockResolvedValueOnce({ ok: true, data: RESULT });

    const { result } = renderHook(() => useAnalyzer());
    act(() => result.current.selectFile(PDF_FILE));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.retryAnalysis());

    await waitFor(() => expect(result.current.status).toBe("done"));
    expect(analyzeSpy).toHaveBeenCalledTimes(2);
    expect(result.current.result).toEqual(RESULT);
  });

  it("reset returns to idle and discards prior state", async () => {
    vi.spyOn(apiClient, "extractPdf").mockResolvedValue({ ok: true, data: DOC });
    vi.spyOn(apiClient, "analyzeText").mockResolvedValue({ ok: true, data: RESULT });

    const { result } = renderHook(() => useAnalyzer());
    act(() => result.current.selectFile(PDF_FILE));
    await waitFor(() => expect(result.current.status).toBe("done"));

    act(() => result.current.reset());

    expect(result.current.status).toBe("idle");
    expect(result.current.doc).toBeNull();
    expect(result.current.result).toBeNull();
  });
});
