"use client";

import { useMemo } from "react";
import { useAnalyzer, type UseAnalyzerResult } from "@/lib/client/useAnalyzer";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { InfoCards } from "@/components/InfoCards";
import { Dropzone } from "@/components/Dropzone";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { ResultBar } from "@/components/ResultBar";
import { ResultsLayout } from "@/components/ResultsLayout";
import { ExtractedTextPanel } from "@/components/ExtractedTextPanel";
import { SuggestionList } from "@/components/SuggestionList";
import { ErrorBanner } from "@/components/ErrorBanner";

export function AnalyzerApp() {
  const analyzer = useAnalyzer();
  const { status, file, doc, result, progress, progressLabel, error, errorPhase } = analyzer;

  const isPdf = file?.type === "application/pdf";
  const showResults = doc !== null || status === "validating" || status === "extracting";
  const showEmptyState = status === "idle" || (status === "error" && errorPhase !== "analysis" && doc === null);
  const announcement = useMemo(() => buildAnnouncement(analyzer), [analyzer]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <main className="mx-auto flex w-full max-w-[1200px] flex-grow flex-col gap-8 px-4 pt-24 pb-12 md:px-6">
        {showEmptyState && (
          <>
            <Hero />
            {status === "error" && error && (
              <ErrorBanner
                error={error}
                onChooseAnotherFile={analyzer.reset}
                onRetryAnalysis={analyzer.retryAnalysis}
                onDismiss={analyzer.dismissError}
              />
            )}
            <Dropzone
              onFileSelected={analyzer.selectFile}
              onRejected={analyzer.reportValidationError}
              tone={status === "error" ? "error" : "default"}
            />
            <InfoCards />
          </>
        )}

        {!showEmptyState && (status === "validating" || status === "extracting") && file && (
          <ProcessingPanel
            file={file}
            stage={status === "validating" ? "uploaded" : "extracting"}
            progress={status === "extracting" && !isPdf ? progress : undefined}
            progressLabel={
              status === "validating"
                ? "Validating file…"
                : isPdf
                  ? "Extracting text from PDF…"
                  : progressLabel || "Extracting…"
            }
            onCancel={analyzer.reset}
          />
        )}

        {!showEmptyState && doc && <ResultBar doc={doc} onReset={analyzer.reset} />}

        {showResults && (
          <ResultsLayout
            left={<ExtractedTextPanel doc={doc} />}
            right={
              <SuggestionList
                suggestions={status === "done" && result ? result.suggestions : null}
                model={status === "done" && result ? result.model : null}
                analysisError={status === "error" && errorPhase === "analysis" ? error : null}
                onRetryAnalysis={analyzer.retryAnalysis}
                onChooseAnotherFile={analyzer.reset}
                onDismissError={analyzer.dismissError}
              />
            }
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function buildAnnouncement(state: UseAnalyzerResult): string {
  switch (state.status) {
    case "idle":
      return "";
    case "validating":
      return "Validating file.";
    case "extracting":
      return `Extracting text. ${state.progressLabel}`.trim();
    case "extracted":
      return "Text extracted. Analyzing content.";
    case "analyzing":
      return "Analyzing content.";
    case "done":
      return `Analysis complete. ${state.result?.suggestions.length ?? 0} suggestions found.`;
    case "error":
      return state.error?.message ?? "Something went wrong.";
    default:
      return "";
  }
}
