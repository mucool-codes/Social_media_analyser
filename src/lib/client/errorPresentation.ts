import type { ApiErrorCode } from "@/lib/types";

export type RecoveryAction = "choose-file" | "retry-analysis" | "dismiss";

export interface ErrorPresentation {
  /** Shown only if the server/network layer didn't already supply a friendly ApiError.message. */
  fallbackTitle: string;
  action: RecoveryAction;
  actionLabel: string;
}

const PRESENTATIONS: Record<ApiErrorCode, ErrorPresentation> = {
  VALIDATION_ERROR: {
    fallbackTitle: "That file couldn't be validated.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  UNSUPPORTED_FILE_TYPE: {
    fallbackTitle: "That file type isn't supported.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  FILE_TOO_LARGE: {
    fallbackTitle: "That file is too large.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  TOO_MANY_PAGES: {
    fallbackTitle: "That PDF has too many pages.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  EMPTY_FILE: {
    fallbackTitle: "That file appears to be empty.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  EXTRACTION_FAILED: {
    fallbackTitle: "We couldn't extract text from that file.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  PARSE_FAILED: {
    fallbackTitle: "We couldn't read that PDF.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  NO_TEXT_FOUND: {
    fallbackTitle: "No readable text was found in that file.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
  ANALYSIS_FAILED: {
    fallbackTitle: "We couldn't analyse that text.",
    action: "retry-analysis",
    actionLabel: "Retry analysis",
  },
  RATE_LIMITED: {
    fallbackTitle: "Too many requests — please wait a moment.",
    action: "retry-analysis",
    actionLabel: "Try again",
  },
  NOT_IMPLEMENTED: {
    fallbackTitle: "That feature isn't available yet.",
    action: "dismiss",
    actionLabel: "OK",
  },
  INTERNAL: {
    fallbackTitle: "Something went wrong on our end.",
    action: "choose-file",
    actionLabel: "Try another file",
  },
};

export function getErrorPresentation(code: ApiErrorCode): ErrorPresentation {
  return PRESENTATIONS[code];
}
