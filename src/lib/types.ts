/**
 * PROVISIONAL — the EXECUTION_PLAN.md §3 type block was not supplied to this session
 * (see question S0-Q1). Authored from the spec's hints (ok/fail helpers, 501 stub
 * responses, extract/analyze endpoints). Treat as a draft the architect can override;
 * do not treat as final until S0-Q1 is answered.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "EXTRACTION_FAILED"
  | "ANALYSIS_FAILED"
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
}

export interface ExtractResponseData {
  fileName: string;
  fileType: AcceptedMimeType;
  text: string;
  pages: ExtractedPage[] | null;
  method: ExtractionMethod;
}

// ---------------------------------------------------------------------------
// /api/analyze
// ---------------------------------------------------------------------------

export interface AnalyzeRequestBody {
  text: string;
}

export type SuggestionCategory =
  | "hook"
  | "length"
  | "hashtags"
  | "cta"
  | "readability"
  | "tone";

export type SuggestionSeverity = "info" | "suggestion" | "warning";

export interface EngagementSuggestion {
  id: string;
  category: SuggestionCategory;
  message: string;
  severity: SuggestionSeverity;
}

export interface AnalyzeResponseData {
  summary: string;
  wordCount: number;
  suggestions: EngagementSuggestion[];
}
