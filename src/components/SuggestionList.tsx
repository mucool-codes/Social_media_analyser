import type { ApiError, Suggestion, SuggestionCategory, SuggestionSeverity } from "@/lib/types";
import { ErrorBanner } from "@/components/ErrorBanner";
import { cx } from "@/lib/client/cx";
import { textBodyMedium, textBodySmall, textDataMono, textH2, textLabelMono } from "@/components/ui/tokens";

interface SuggestionListProps {
  /** null renders the loading skeleton (used while analyzing). */
  suggestions: Suggestion[] | null;
  model: string | null;
  analysisError: ApiError | null;
  onRetryAnalysis: () => void;
  onChooseAnotherFile: () => void;
  onDismissError: () => void;
}

const SEVERITY_ORDER: Record<SuggestionSeverity, number> = { high: 0, medium: 1, low: 2 };

const SEVERITY_STYLES: Record<SuggestionSeverity, { border: string; text: string; label: string }> = {
  high: { border: "border-l-[#C8402F]", text: "text-[#C8402F]", label: "High" },
  medium: { border: "border-l-[#E0912F]", text: "text-[#E0912F]", label: "Medium" },
  low: { border: "border-l-[#5B6672]", text: "text-[#5B6672]", label: "Low" },
};

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  hook: "Hook",
  length: "Length",
  hashtags: "Hashtags",
  cta: "CTA",
  clarity: "Clarity",
  tone: "Tone",
};

export function SuggestionList({
  suggestions,
  model,
  analysisError,
  onRetryAnalysis,
  onChooseAnotherFile,
  onDismissError,
}: SuggestionListProps) {
  const isHeuristic = model === "heuristic-fallback";
  const sorted = suggestions
    ? [...suggestions].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 border-b border-[#D5DAD7] pb-2">
        <h2 className={cx(textH2, "text-[16px] text-[#14181C]")}>Suggestions</h2>
        {sorted && model && (
          <span className={cx(textLabelMono, "text-[#5B6672]")}>
            {sorted.length} found · {isHeuristic ? "Heuristic fallback" : model}
          </span>
        )}
      </div>

      {analysisError && (
        <ErrorBanner
          error={analysisError}
          onChooseAnotherFile={onChooseAnotherFile}
          onRetryAnalysis={onRetryAnalysis}
          onDismiss={onDismissError}
        />
      )}

      {!analysisError && sorted === null && (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[1, 2, 3].map((key) => (
            <div key={key} className="flex flex-col gap-2 rounded border border-[#D5DAD7] bg-white p-4">
              <div className="h-3 w-1/3 rounded-sm bg-[#D5DAD7]/40" />
              <div className="h-3 w-2/3 rounded-sm bg-[#D5DAD7]/40" />
              <div className="h-3 w-full rounded-sm bg-[#D5DAD7]/40" />
            </div>
          ))}
        </div>
      )}

      {!analysisError && sorted !== null && sorted.length === 0 && (
        <p className={cx(textBodySmall, "text-[#5B6672]")}>No suggestions — this post is in good shape.</p>
      )}

      {!analysisError &&
        sorted !== null &&
        sorted.map((suggestion) => {
          const severity = SEVERITY_STYLES[suggestion.severity];
          return (
            <article
              key={suggestion.id}
              className={cx(
                "flex flex-col gap-2 rounded border border-[#D5DAD7] border-l-4 bg-white p-4",
                severity.border,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      textLabelMono,
                      "border border-[#D5DAD7] bg-[#EDF0EE] px-2 py-0.5 text-[#14181C]",
                    )}
                  >
                    {CATEGORY_LABELS[suggestion.category]}
                  </span>
                  <h3 className={cx(textBodyMedium, "text-[#14181C]")}>{suggestion.title}</h3>
                </div>
                <span className={cx(textLabelMono, "font-bold", severity.text)}>{severity.label}</span>
              </div>
              <p className={cx(textBodySmall, "text-[#5B6672]")}>{suggestion.detail}</p>
              {suggestion.example && (
                <div className="mt-1 rounded-sm border-l-[3px] border-[#14181C] bg-[#EDF0EE] p-3">
                  <span className={cx(textLabelMono, "mb-1 block text-[#5B6672]")}>Suggested rewrite</span>
                  <p className={cx(textDataMono, "whitespace-pre-wrap text-[#14181C]")}>{suggestion.example}</p>
                </div>
              )}
            </article>
          );
        })}
    </div>
  );
}
