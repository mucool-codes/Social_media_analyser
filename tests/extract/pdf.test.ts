import { PasswordException, PDFParse } from "pdf-parse";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PDF_PAGES } from "@/lib/config";
import { ExtractionError, extractFromPdf } from "@/lib/extract/pdf";
import { buildTestPdf } from "./fixtures/build-pdf";

describe("extractFromPdf", () => {
  it("extracts text and per-page data from a clean multi-page PDF", async () => {
    const buffer = buildTestPdf([
      ["Hello world", "Second line of page one."],
      ["Page two starts here."],
    ]);

    const doc = await extractFromPdf(buffer, "sample.pdf");

    expect(doc.method).toBe("pdf-parse");
    expect(doc.meta.fileType).toBe("application/pdf");
    expect(doc.meta.fileName).toBe("sample.pdf");
    expect(doc.meta.pageCount).toBe(2);
    expect(doc.meta.meanConfidence).toBeUndefined();
    expect(doc.warnings).toEqual([]);
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[0]?.pageNumber).toBe(1);
    expect(doc.pages[0]?.text).toContain("Hello world");
    expect(doc.pages[1]?.pageNumber).toBe(2);
    expect(doc.pages[1]?.text).toContain("Page two starts here.");
    expect(doc.text).toContain("Hello world");
    expect(doc.text).toContain("Page two starts here.");
  });

  it("rejects a PDF over MAX_PDF_PAGES with TOO_MANY_PAGES", async () => {
    const buffer = buildTestPdf(Array.from({ length: MAX_PDF_PAGES + 1 }, () => ["content"]));

    await expect(extractFromPdf(buffer, "big.pdf")).rejects.toMatchObject({
      code: "TOO_MANY_PAGES",
    });
  });

  it("accepts a PDF at exactly MAX_PDF_PAGES", async () => {
    const buffer = buildTestPdf(Array.from({ length: MAX_PDF_PAGES }, () => ["content"]));
    const doc = await extractFromPdf(buffer, "max-pages.pdf");
    expect(doc.meta.pageCount).toBe(MAX_PDF_PAGES);
  });

  it("returns NO_TEXT_FOUND with a scan-suggestion message for a blank PDF", async () => {
    const buffer = buildTestPdf([[], []]);

    await expect(extractFromPdf(buffer, "scan.pdf")).rejects.toMatchObject({
      code: "NO_TEXT_FOUND",
    });

    try {
      await extractFromPdf(buffer, "scan.pdf");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionError);
      expect((error as ExtractionError).message.toLowerCase()).toContain("image");
    }
  });

  it("does not fall for the page-count marker noise in pdf-parse's text field", async () => {
    // pdf-parse's TextResult.text injects "-- N of M --" markers between pages, which
    // alone can exceed a naive character-count threshold for an otherwise-blank
    // multi-page document. Enough blank pages must still trigger NO_TEXT_FOUND.
    const buffer = buildTestPdf(Array.from({ length: 5 }, () => []));

    await expect(extractFromPdf(buffer, "blank-multi.pdf")).rejects.toMatchObject({
      code: "NO_TEXT_FOUND",
    });
  });

  it("rejects a corrupted PDF with PARSE_FAILED", async () => {
    const buffer = Buffer.from("%PDF-1.4\nthis is not a real pdf body at all");

    await expect(extractFromPdf(buffer, "broken.pdf")).rejects.toMatchObject({
      code: "PARSE_FAILED",
    });
  });

  it("sets durationMs on the returned metadata", async () => {
    const buffer = buildTestPdf([["Some real text content here."]]);
    const doc = await extractFromPdf(buffer, "timed.pdf");
    expect(doc.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  describe("encrypted PDFs", () => {
    // Hand-crafting a real password-protected PDF requires the actual PDF encryption
    // algorithm (RC4/AES key derivation from owner/user passwords per the spec) — not
    // something reproducible without a PDF-writing library, which is outside this
    // session's dependency budget. This is the one path in this suite that stubs
    // pdf-parse directly rather than exercising it for real, scoped to a single test.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("rejects a password-protected PDF with PARSE_FAILED", async () => {
      vi.spyOn(PDFParse.prototype, "getInfo").mockRejectedValue(new PasswordException("need a password"));
      vi.spyOn(PDFParse.prototype, "destroy").mockResolvedValue(undefined);

      const buffer = buildTestPdf([["irrelevant"]]);
      await expect(extractFromPdf(buffer, "locked.pdf")).rejects.toMatchObject({
        code: "PARSE_FAILED",
      });
    });
  });
});
