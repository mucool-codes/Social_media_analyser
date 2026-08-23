import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES } from "@/lib/config";
import { sniffMimeFromBytes, validateFileMeta } from "@/lib/validation";

describe("validation smoke test", () => {
  it("accepts a valid PDF file meta", () => {
    const result = validateFileMeta({ name: "post.pdf", size: 1024, type: "application/pdf" });
    expect(result.ok).toBe(true);
  });

  it("rejects an unsupported file type with a human-readable message", () => {
    const result = validateFileMeta({ name: "post.docx", size: 1024, type: "application/msword" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNSUPPORTED_FILE_TYPE");
      expect(result.message).not.toBe("Invalid file");
    }
  });

  it("sniffs a PDF from its magic bytes", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    expect(sniffMimeFromBytes(bytes)).toBe("application/pdf");
  });
});

describe("validateFileMeta", () => {
  it("rejects a file with an empty name", () => {
    const result = validateFileMeta({ name: "", size: 1024, type: "application/pdf" });
    expect(result).toEqual({ ok: false, code: "VALIDATION_ERROR", message: "That file doesn't have a name." });
  });

  it("rejects a name that is only whitespace", () => {
    const result = validateFileMeta({ name: "   ", size: 1024, type: "application/pdf" });
    expect(result.ok).toBe(false);
  });

  it("rejects a zero-byte file with EMPTY_FILE", () => {
    const result = validateFileMeta({ name: "post.pdf", size: 0, type: "application/pdf" });
    expect(result).toEqual({ ok: false, code: "EMPTY_FILE", message: "That file appears to be empty." });
  });

  it("accepts a file exactly at the size limit", () => {
    const result = validateFileMeta({ name: "post.pdf", size: MAX_FILE_BYTES, type: "application/pdf" });
    expect(result.ok).toBe(true);
  });

  it("rejects a file one byte over the size limit with FILE_TOO_LARGE", () => {
    const result = validateFileMeta({ name: "post.pdf", size: MAX_FILE_BYTES + 1, type: "application/pdf" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FILE_TOO_LARGE");
      expect(result.message).toMatch(/4 MB/);
    }
  });

  it("uses a friendlier name for known unsupported types (e.g. Word docs)", () => {
    const result = validateFileMeta({
      name: "post.docx",
      size: 1024,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/Word documents aren't supported/i);
  });

  it("accepts every AcceptedMimeType", () => {
    for (const type of ["application/pdf", "image/png", "image/jpeg", "image/webp"]) {
      expect(validateFileMeta({ name: "post", size: 1024, type }).ok).toBe(true);
    }
  });
});

describe("sniffMimeFromBytes", () => {
  it("sniffs a PNG from its magic bytes", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffMimeFromBytes(bytes)).toBe("image/png");
  });

  it("sniffs a JPEG from its magic bytes", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    expect(sniffMimeFromBytes(bytes)).toBe("image/jpeg");
  });

  it("sniffs a WebP from its RIFF....WEBP header", () => {
    // RIFF <4-byte size> WEBP
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(sniffMimeFromBytes(bytes)).toBe("image/webp");
  });

  it("returns null for bytes matching no known signature", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(sniffMimeFromBytes(bytes)).toBeNull();
  });

  it("returns null instead of throwing on an empty or too-short buffer", () => {
    expect(sniffMimeFromBytes(new Uint8Array([]))).toBeNull();
    expect(sniffMimeFromBytes(new Uint8Array([0x25, 0x50]))).toBeNull();
  });

  it("does not mistake a RIFF file for WebP when it's a different FourCC (e.g. WAV)", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(sniffMimeFromBytes(bytes)).toBeNull();
  });
});
