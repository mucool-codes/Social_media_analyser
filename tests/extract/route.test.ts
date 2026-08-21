// @vitest-environment node
//
// This route only ever runs under `runtime = "nodejs"`. Under the suite's default
// jsdom environment, jsdom's polyfilled File/FormData are a different class from the
// real Node/undici ones NextRequest.formData() parses against, so a jsdom-built
// FormData silently fails to round-trip. Forcing the real Node environment here
// matches production and lets these tests exercise the actual parser.
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/extract/route";
import { MAX_FILE_BYTES } from "@/lib/config";
import type { ApiResponse, ExtractedDoc } from "@/lib/types";
import { buildTestPdf } from "./fixtures/build-pdf";

function requestWithFile(file: File): NextRequest {
  const formData = new FormData();
  formData.set("file", file);
  return new NextRequest("http://localhost/api/extract", { method: "POST", body: formData });
}

describe("POST /api/extract", () => {
  it("extracts a real PDF end-to-end", async () => {
    const buffer = buildTestPdf([["Hello from the route test."]]);
    const file = new File([new Uint8Array(buffer)], "post.pdf", { type: "application/pdf" });

    const res = await POST(requestWithFile(file));
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    if (body.ok) {
      expect(body.data.text).toContain("Hello from the route test.");
      expect(body.data.meta.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("rejects a non-file field", async () => {
    const formData = new FormData();
    formData.set("file", "not a file");
    const req = new NextRequest("http://localhost/api/extract", { method: "POST", body: formData });

    const res = await POST(req);
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an oversized file before touching pdf-parse", async () => {
    const oversized = new Uint8Array(MAX_FILE_BYTES + 1);
    const file = new File([oversized], "big.pdf", { type: "application/pdf" });

    const res = await POST(requestWithFile(file));
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(413);
    if (!body.ok) expect(body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects an image posted to this route, pointing at the client-side path", async () => {
    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const file = new File([pngBytes], "photo.png", { type: "image/png" });

    const res = await POST(requestWithFile(file));
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(415);
    if (!body.ok) {
      expect(body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
      expect(body.error.message.toLowerCase()).toContain("browser");
    }
  });

  it("rejects a spoofed file (declared as PDF, bytes are not a PDF)", async () => {
    const fakeBytes = new TextEncoder().encode("just some text pretending to be a pdf");
    const file = new File([fakeBytes], "fake.pdf", { type: "application/pdf" });

    const res = await POST(requestWithFile(file));
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(415);
    if (!body.ok) expect(body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("maps NO_TEXT_FOUND from a blank scanned-looking PDF", async () => {
    const buffer = buildTestPdf([[], []]);
    const file = new File([new Uint8Array(buffer)], "scan.pdf", { type: "application/pdf" });

    const res = await POST(requestWithFile(file));
    const body = (await res.json()) as ApiResponse<ExtractedDoc>;

    expect(res.status).toBe(422);
    if (!body.ok) expect(body.error.code).toBe("NO_TEXT_FOUND");
  });
});
