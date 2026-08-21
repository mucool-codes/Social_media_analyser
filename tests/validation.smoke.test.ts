import { describe, expect, it } from "vitest";
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
