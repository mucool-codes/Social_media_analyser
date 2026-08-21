// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "EMPTY_FILE"
  | "EXTRACTION_FAILED"
  | "PARSE_FAILED"
  | "NO_TEXT_FOUND"
  | "ANALYSIS_FAILED"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// ---------------------------------------------------------------------------
// Shared file/domain types
// ---------------------------------------------------------------------------

export type AcceptedMimeType = "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

export interface FileMeta {
  name: string;
  size: number;
  type: string;
}

// ---------------------------------------------------------------------------
// /api/extract
// ---------------------------------------------------------------------------

export type ExtractionMethod = "pdf-parse" | "ocr";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  /** OCR only, 0-100. Absent for pdf-parse-derived pages. */
  confidence?: number;
}

export interface ExtractedDocMeta {
  fileName: string;
  fileType: AcceptedMimeType;
  sizeBytes: number;
  pageCount: number;
  durationMs: number;
  /** OCR only. Absent when method is "pdf-parse". */
  meanConfidence?: number;
}

export interface ExtractedDoc {
  meta: ExtractedDocMeta;
  text: string;
  pages: ExtractedPage[];
  method: ExtractionMethod;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// /api/analyze
// ---------------------------------------------------------------------------

export interface AnalyzeRequestBody {
  text: string;
}

export type SuggestionCategory = "hook" | "length" | "hashtags" | "cta" | "clarity" | "tone";

export type SuggestionSeverity = "high" | "medium" | "low";

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  /** Imperative, <=60 chars. */
  title: string;
  /** <=240 chars. */
  detail: string;
  example?: string;
}

/**
 * PROVISIONAL — S0-Q1's DECISION confirmed AnalysisResult "gains full metrics{}
 * and model:string" and that readability:number lives inside metrics, but didn't
 * enumerate the rest of the fields. See S0-Q3. Adjust this interface (not the
 * others in this file) once that lands.
 */
export interface AnalysisMetrics {
  wordCount: number;
  charCount: number;
  readability: number;
}

export interface AnalysisResult {
  summary: string;
  metrics: AnalysisMetrics;
  suggestions: Suggestion[];
  model: string;
}
