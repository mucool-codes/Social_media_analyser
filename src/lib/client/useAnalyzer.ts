"use client";

import { useCallback, useReducer, useRef } from "react";
import { analyzeText, extractPdf } from "@/lib/client/apiClient";
import { extractFromImage } from "@/lib/extract/ocr";
import { validateFileMeta } from "@/lib/validation";
import type { AnalysisResult, ApiError, ExtractedDoc } from "@/lib/types";

export type AnalyzerStatus =
  | "idle"
  | "validating"
  | "extracting"
  | "extracted"
  | "analyzing"
  | "done"
  | "error";

export type AnalyzerErrorPhase = "validation" | "extraction" | "analysis";

export interface AnalyzerState {
  status: AnalyzerStatus;
  file: File | null;
  doc: ExtractedDoc | null;
  result: AnalysisResult | null;
  progress: number;
  progressLabel: string;
  error: ApiError | null;
  errorPhase: AnalyzerErrorPhase | null;
}

const initialState: AnalyzerState = {
  status: "idle",
  file: null,
  doc: null,
  result: null,
  progress: 0,
  progressLabel: "",
  error: null,
  errorPhase: null,
};

type Action =
  | { type: "SELECT_FILE"; file: File }
  | { type: "VALIDATION_FAILED"; error: ApiError }
  | { type: "EXTRACTION_STARTED" }
  | { type: "EXTRACTION_PROGRESS"; progress: number; label: string }
  | { type: "EXTRACTION_SUCCEEDED"; doc: ExtractedDoc }
  | { type: "EXTRACTION_FAILED"; error: ApiError }
  | { type: "ANALYSIS_STARTED" }
  | { type: "ANALYSIS_SUCCEEDED"; result: AnalysisResult }
  | { type: "ANALYSIS_FAILED"; error: ApiError }
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

function reducer(state: AnalyzerState, action: Action): AnalyzerState {
  switch (action.type) {
    case "SELECT_FILE":
      return { ...initialState, status: "validating", file: action.file };
    case "VALIDATION_FAILED":
      return { ...state, status: "error", error: action.error, errorPhase: "validation" };
    case "EXTRACTION_STARTED":
      return { ...state, status: "extracting", progress: 0, progressLabel: "Starting…" };
    case "EXTRACTION_PROGRESS":
      return { ...state, progress: action.progress, progressLabel: action.label };
    case "EXTRACTION_SUCCEEDED":
      return { ...state, status: "extracted", doc: action.doc, error: null, errorPhase: null };
    case "EXTRACTION_FAILED":
      return { ...state, status: "error", error: action.error, errorPhase: "extraction" };
    case "ANALYSIS_STARTED":
      return { ...state, status: "analyzing" };
    case "ANALYSIS_SUCCEEDED":
      return { ...state, status: "done", result: action.result, error: null, errorPhase: null };
    case "ANALYSIS_FAILED":
      return { ...state, status: "error", error: action.error, errorPhase: "analysis" };
    case "DISMISS_ERROR":
      if (state.errorPhase === "analysis" && state.doc) {
        return { ...state, status: "extracted", error: null, errorPhase: null };
      }
      return { ...initialState };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export interface UseAnalyzerResult extends AnalyzerState {
  selectFile: (file: File) => void;
  retryAnalysis: () => void;
  reset: () => void;
  dismissError: () => void;
}

/**
 * Single source of truth for the upload -> extract -> analyze flow. A ref-tracked request
 * sequence number guards against a stale extraction/analysis response clobbering state after
 * the user has already picked a new file or reset.
 */
export function useAnalyzer(): UseAnalyzerResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestSeq = useRef(0);

  const runAnalysis = useCallback(async (text: string, seq: number) => {
    dispatch({ type: "ANALYSIS_STARTED" });
    const response = await analyzeText(text);
    if (seq !== requestSeq.current) return;

    if (response.ok) {
      dispatch({ type: "ANALYSIS_SUCCEEDED", result: response.data });
    } else {
      dispatch({ type: "ANALYSIS_FAILED", error: response.error });
    }
  }, []);

  const runExtraction = useCallback(
    async (file: File, seq: number) => {
      dispatch({ type: "EXTRACTION_STARTED" });

      let doc: ExtractedDoc;
      if (file.type === "application/pdf") {
        const response = await extractPdf(file);
        if (seq !== requestSeq.current) return;
        if (!response.ok) {
          dispatch({ type: "EXTRACTION_FAILED", error: response.error });
          return;
        }
        doc = response.data;
      } else {
        try {
          doc = await extractFromImage(file, (p) => {
            if (seq !== requestSeq.current) return;
            dispatch({ type: "EXTRACTION_PROGRESS", progress: p.progress * 100, label: p.status });
          });
        } catch (err) {
          if (seq !== requestSeq.current) return;
          const message = err instanceof Error ? err.message : "We couldn't read the text in that image.";
          dispatch({ type: "EXTRACTION_FAILED", error: { code: "EXTRACTION_FAILED", message } });
          return;
        }
      }

      if (seq !== requestSeq.current) return;
      dispatch({ type: "EXTRACTION_SUCCEEDED", doc });
      void runAnalysis(doc.text, seq);
    },
    [runAnalysis],
  );

  const selectFile = useCallback(
    (file: File) => {
      const seq = ++requestSeq.current;
      dispatch({ type: "SELECT_FILE", file });

      const validation = validateFileMeta({ name: file.name, size: file.size, type: file.type });
      if (!validation.ok) {
        dispatch({ type: "VALIDATION_FAILED", error: { code: validation.code, message: validation.message } });
        return;
      }

      void runExtraction(file, seq);
    },
    [runExtraction],
  );

  const retryAnalysis = useCallback(() => {
    if (!state.doc) return;
    const seq = ++requestSeq.current;
    void runAnalysis(state.doc.text, seq);
  }, [state.doc, runAnalysis]);

  const reset = useCallback(() => {
    requestSeq.current += 1;
    dispatch({ type: "RESET" });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: "DISMISS_ERROR" });
  }, []);

  return { ...state, selectFile, retryAnalysis, reset, dismissError };
}
