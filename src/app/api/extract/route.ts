import type { NextRequest, NextResponse } from "next/server";
import { fail, withErrorHandling } from "@/lib/http";

// pdf-parse and tesseract.js need Node APIs (fs, WASM), not the Edge runtime.
export const runtime = "nodejs";

export const POST = withErrorHandling(async (_req: NextRequest): Promise<NextResponse> => {
  return fail("NOT_IMPLEMENTED", "Text extraction isn't implemented yet.", 501);
});
