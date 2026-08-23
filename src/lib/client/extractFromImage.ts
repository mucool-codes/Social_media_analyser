import type { ExtractedDoc } from "@/lib/types";

/**
 * Temporary stand-in for Session 1's browser-side OCR. Swap this file's contents for
 * `export { extractFromImage } from "@/lib/extract/ocr"` (or update the import site in
 * useAnalyzer.ts) once S1 merges.
 *
 * Signature ratified per S3-Q1: (file, onProgress: (progress: number, label: string) => void)
 * => Promise<ExtractedDoc>, throwing on failure. This is a constraint on S1's real
 * implementation, not a guess to be revisited.
 */

export type OcrProgressListener = (progress: number, label: string) => void;

const MOCK_STEPS: ReadonlyArray<{ atProgress: number; label: string }> = [
  { atProgress: 8, label: "Loading OCR engine" },
  { atProgress: 35, label: "Recognising text — page 1" },
  { atProgress: 70, label: "Recognising text — page 1" },
  { atProgress: 95, label: "Finalising" },
];

const MOCK_TEXT =
  "[Mock OCR output — Session 1's real extractFromImage() will replace this.]\n\n" +
  "This placeholder stands in for what Tesseract.js would recognise from your image. " +
  "Once Session 1 merges, this exact function signature will be backed by real OCR.";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAcceptedMime(type: string): ExtractedDoc["meta"]["fileType"] {
  if (type === "image/png" || type === "image/jpeg" || type === "image/webp" || type === "application/pdf") {
    return type;
  }
  return "image/png";
}

export async function extractFromImage(file: File, onProgress: OcrProgressListener): Promise<ExtractedDoc> {
  const start = Date.now();

  for (const step of MOCK_STEPS) {
    await wait(280);
    onProgress(step.atProgress, step.label);
  }

  onProgress(100, "Done");

  return {
    meta: {
      fileName: file.name,
      fileType: toAcceptedMime(file.type),
      sizeBytes: file.size,
      pageCount: 1,
      durationMs: Date.now() - start,
      meanConfidence: 91,
    },
    text: MOCK_TEXT,
    pages: [{ pageNumber: 1, text: MOCK_TEXT, confidence: 91 }],
    method: "ocr",
    warnings: [],
  };
}
