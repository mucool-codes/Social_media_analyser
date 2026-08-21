import type { AcceptedMimeType } from "@/lib/types";

// Vercel Hobby's request body limit is 4.5 MB; leave headroom below it.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_MIME: readonly AcceptedMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_PDF_PAGES = 20;

// Pinned to the exact npm versions this project installs, so the CDN-hosted
// worker/core/lang assets never drift from what's in package.json.
const TESSERACT_VERSION = "7.0.0";
const TESSERACT_CORE_VERSION = "7.0.0";

export const TESSERACT_CDN = {
  workerPath: `https://unpkg.com/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
  corePath: `https://unpkg.com/tesseract.js-core@${TESSERACT_CORE_VERSION}/tesseract-core.wasm.js`,
  langPath: "https://tessdata.projectnaptha.com/4.0.0",
} as const;

/**
 * Server-only. Returns undefined rather than throwing when unset — the app must run
 * without Gemini configured. Throws loudly if ever imported into client code, since
 * process.env.GEMINI_API_KEY would otherwise silently be undefined in the browser too.
 */
export function getGeminiApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    throw new Error("getGeminiApiKey() is server-only and must not be called from the client.");
  }
  return process.env.GEMINI_API_KEY;
}
