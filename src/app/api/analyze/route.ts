import type { NextRequest, NextResponse } from "next/server";
import { fail, withErrorHandling } from "@/lib/http";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (_req: NextRequest): Promise<NextResponse> => {
  return fail("NOT_IMPLEMENTED", "Content analysis isn't implemented yet.", 501);
});
