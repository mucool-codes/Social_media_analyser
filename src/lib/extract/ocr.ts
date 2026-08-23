"use client";

import { createWorker } from "tesseract.js";
import { TESSERACT_CDN } from "@/lib/config";
import type { AcceptedMimeType, ExtractedDoc } from "@/lib/types";
import { normalizeText } from "./format";

export interface OcrProgress {
  status: string;
  progress: number;
}

const LOW_CONFIDENCE_THRESHOLD = 60;

/** Tesseract's internal logger statuses, mapped to copy the progress bar can show
 * directly. Anything not in this table falls back to the raw status string. */
const STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "Loading OCR engine",
  "initializing tesseract": "Loading OCR engine",
  "initialized tesseract": "Loading OCR engine",
  "loading language traineddata": "Loading language data",
  "loaded language traineddata": "Loading language data",
  "initializing api": "Preparing OCR engine",
  "recognizing text": "Recognising text",
};

function friendlyStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export async function extractFromImage(
  file: File,
  onProgress: (p: OcrProgress) => void,
): Promise<ExtractedDoc> {
  const start = Date.now();

  const worker = await createWorker("eng", undefined, {
    workerPath: TESSERACT_CDN.workerPath,
    corePath: TESSERACT_CDN.corePath,
    langPath: TESSERACT_CDN.langPath,
    logger: (m) => onProgress({ status: friendlyStatus(m.status), progress: m.progress }),
  });

  try {
    const { data } = await worker.recognize(file);

    const warnings: string[] = [];
    if (data.confidence < LOW_CONFIDENCE_THRESHOLD) {
      warnings.push("Low-confidence scan — results may be inaccurate. A sharper image will help.");
    }

    const text = normalizeText(data.text);

    return {
      meta: {
        fileName: file.name,
        fileType: file.type as AcceptedMimeType,
        sizeBytes: file.size,
        pageCount: 1,
        durationMs: Date.now() - start,
        meanConfidence: data.confidence,
      },
      text,
      pages: [{ pageNumber: 1, text, confidence: data.confidence }],
      method: "ocr",
      warnings,
    };
  } finally {
    await worker.terminate();
  }
}
