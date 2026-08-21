import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/config";
import type { ApiErrorCode, FileMeta } from "@/lib/types";

export type ValidationResult = { ok: true } | { ok: false; code: ApiErrorCode; message: string };

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  "application/msword": "Word documents",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word documents",
  "text/plain": "Plain text files",
  "image/gif": "GIF images",
  "image/heic": "HEIC images",
  "application/vnd.ms-excel": "Excel files",
};

/**
 * Client- and server-safe. Must not import anything Node-specific: the client calls
 * this before upload, the server calls it again on the received file.
 */
export function validateFileMeta({ name, size, type }: FileMeta): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "That file doesn't have a name." };
  }

  if (size <= 0) {
    return { ok: false, code: "EMPTY_FILE", message: "That file appears to be empty." };
  }

  if (size > MAX_FILE_BYTES) {
    const maxMb = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `That file is too large — please upload something under ${maxMb} MB.`,
    };
  }

  if (!ACCEPTED_MIME.includes(type as (typeof ACCEPTED_MIME)[number])) {
    const friendly = FRIENDLY_TYPE_NAMES[type];
    const prefix = friendly ? `${friendly} aren't supported yet` : "That file type isn't supported";
    return {
      ok: false,
      code: "UNSUPPORTED_FILE_TYPE",
      message: `${prefix} — please upload a PDF or an image (PNG, JPEG, or WebP).`,
    };
  }

  return { ok: true };
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function bytesStartWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Inspects magic bytes rather than trusting a client-supplied MIME type, which is
 * trivially spoofable (a renamed .exe can still claim to be "image/png").
 */
export function sniffMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytesStartWith(bytes, PDF_MAGIC)) return "application/pdf";
  if (bytesStartWith(bytes, PNG_MAGIC)) return "image/png";
  if (bytesStartWith(bytes, JPEG_MAGIC)) return "image/jpeg";

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
