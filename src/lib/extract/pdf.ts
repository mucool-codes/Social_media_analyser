import { PasswordException, PDFParse } from "pdf-parse";
import { MAX_PDF_PAGES } from "@/lib/config";
import type { ApiErrorCode, ExtractedDoc, ExtractedPage } from "@/lib/types";
import { normalizeText } from "./format";

/** Carries an ApiErrorCode out of extractFromPdf so the route can respond with
 * fail(code, message) instead of a generic 500 — see src/lib/http.ts. */
export class ExtractionError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const MIN_TEXT_LENGTH = 20;

export async function extractFromPdf(buffer: Buffer, filename: string): Promise<ExtractedDoc> {
  const start = Date.now();
  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo();
    if (info.total > MAX_PDF_PAGES) {
      throw new ExtractionError(
        "TOO_MANY_PAGES",
        `This PDF has ${info.total} pages — please upload something under ${MAX_PDF_PAGES} pages.`,
      );
    }

    const result = await parser.getText();

    // result.text (the concatenated field) injects its own "-- N of M --" page
    // markers between pages, so a blank multi-page PDF can clear a naive length
    // check on marker noise alone. Measure the real per-page text instead.
    const rawPageTexts = result.pages.map((p) => p.text);
    const totalRawLength = rawPageTexts.join("").trim().length;
    if (totalRawLength < MIN_TEXT_LENGTH) {
      throw new ExtractionError(
        "NO_TEXT_FOUND",
        "This PDF doesn't contain any extractable text — it's probably a scanned document or photo. Try uploading it as an image instead so OCR can read it.",
      );
    }

    const pages: ExtractedPage[] = result.pages.map((p) => ({
      pageNumber: p.num,
      text: normalizeText(p.text),
    }));
    const text = normalizeText(rawPageTexts.join("\f"));

    return {
      meta: {
        fileName: filename,
        fileType: "application/pdf",
        sizeBytes: buffer.length,
        pageCount: result.total,
        durationMs: Date.now() - start,
      },
      text,
      pages,
      method: "pdf-parse",
      warnings: [],
    };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    if (error instanceof PasswordException) {
      throw new ExtractionError(
        "PARSE_FAILED",
        "This PDF is password-protected. Please upload an unlocked copy.",
      );
    }
    throw new ExtractionError(
      "PARSE_FAILED",
      "Couldn't read this PDF — it may be corrupted or in an unsupported format.",
    );
  } finally {
    await parser.destroy();
  }
}
