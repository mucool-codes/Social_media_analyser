import type { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CloseIcon, WarningIcon } from "@/components/ui/icons";
import { getErrorPresentation } from "@/lib/client/errorPresentation";
import { cx } from "@/lib/client/cx";
import { textH2 } from "@/components/ui/tokens";

interface ErrorBannerProps {
  error: ApiError;
  onChooseAnotherFile: () => void;
  onRetryAnalysis: () => void;
  onDismiss: () => void;
}

/** Maps every ApiErrorCode to a recovery action and picks the matching handler. Never
 * shows a raw error string — falls back to friendly copy if the server message is missing. */
export function ErrorBanner({ error, onChooseAnotherFile, onRetryAnalysis, onDismiss }: ErrorBannerProps) {
  const presentation = getErrorPresentation(error.code);
  const title = error.message || presentation.fallbackTitle;

  const handleAction =
    presentation.action === "retry-analysis"
      ? onRetryAnalysis
      : presentation.action === "dismiss"
        ? onDismiss
        : onChooseAnotherFile;

  return (
    <div
      role="alert"
      className="flex w-full flex-col items-start justify-between gap-4 rounded-lg border border-[#C8402F] bg-white p-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3 sm:items-center">
        <WarningIcon className="h-5 w-5 shrink-0 text-[#C8402F]" />
        <p className={cx(textH2, "text-[15px] text-[#14181C]")}>{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Button variant="secondary" onClick={handleAction}>
          {presentation.actionLabel}
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-[#5B6672] transition-colors hover:text-[#14181C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14181C]"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
