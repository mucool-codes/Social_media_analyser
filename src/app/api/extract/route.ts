import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { ExtractionError, extractFromPdf } from "@/lib/extract/pdf";
import { fail, ok, withErrorHandling } from "@/lib/http";
import type { ApiResponse, ExtractedDoc } from "@/lib/types";
import { sniffMimeFromBytes, validateFileMeta } from "@/lib/validation";

// pdf-parse needs Node APIs (fs, WASM), not the Edge runtime.
export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (req: NextRequest): Promise<NextResponse<ApiResponse<ExtractedDoc>>> => {
    const start = Date.now();

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return fail("VALIDATION_ERROR", "Expected multipart/form-data with a \"file\" field.");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("VALIDATION_ERROR", "Expected multipart/form-data with a \"file\" field.");
    }

    const metaCheck = validateFileMeta({ name: file.name, size: file.size, type: file.type });
    if (!metaCheck.ok) {
      return fail(metaCheck.code, metaCheck.message);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMimeFromBytes(new Uint8Array(buffer));

    if (sniffed !== "application/pdf") {
      if (sniffed?.startsWith("image/")) {
        return fail(
          "UNSUPPORTED_FILE_TYPE",
          "Images are extracted in your browser, not through this endpoint — the OCR step runs client-side.",
        );
      }
      return fail("UNSUPPORTED_FILE_TYPE", "That doesn't look like a valid PDF file.");
    }

    try {
      const doc = await extractFromPdf(buffer, file.name);
      doc.meta.durationMs = Date.now() - start;
      return ok(doc);
    } catch (error) {
      if (error instanceof ExtractionError) {
        return fail(error.code, error.message);
      }
      throw error;
    }
  },
);
