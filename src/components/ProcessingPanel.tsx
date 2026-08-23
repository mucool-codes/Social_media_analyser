import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { DocumentIcon } from "@/components/ui/icons";
import { cx } from "@/lib/client/cx";
import { formatBytes } from "@/lib/client/format";
import { textDataMono, textLabelMono } from "@/components/ui/tokens";

type Stage = "uploaded" | "extracting" | "analyzing";

interface ProcessingPanelProps {
  file: File;
  stage: Stage;
  progress?: number;
  progressLabel: string;
  onCancel: () => void;
}

const STAGES: ReadonlyArray<{ key: Stage; label: string }> = [
  { key: "uploaded", label: "Uploaded" },
  { key: "extracting", label: "Extracting" },
  { key: "analyzing", label: "Analyzing" },
];

export function ProcessingPanel({ file, stage, progress, progressLabel, onCancel }: ProcessingPanelProps) {
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  const kind = file.type === "application/pdf" ? "PDF" : "IMAGE · OCR";

  return (
    <div className="flex w-full flex-col justify-between gap-6 rounded-lg border border-[#D5DAD7] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <DocumentIcon className="h-8 w-8 text-[#14181C]" />
          <div className="flex flex-col gap-0.5">
            <span className={cx(textDataMono, "text-[#14181C]")}>{file.name}</span>
            <span className={cx(textLabelMono, "text-[#5B6672]")}>
              {formatBytes(file.size)} · {kind}
            </span>
          </div>
        </div>
        <Button variant="ghost" mono onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <ProgressBar label={progressLabel} progress={progress} />

      <div className="flex items-center">
        {STAGES.map((s, index) => (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full",
                  index < stageIndex
                    ? "bg-[#14181C]"
                    : index === stageIndex
                      ? "border border-[#14181C] bg-[#D8F252]"
                      : "border border-[#5B6672]",
                )}
                aria-hidden="true"
              />
              <span className={cx(textLabelMono, index <= stageIndex ? "text-[#14181C]" : "text-[#5B6672]")}>
                {s.label}
              </span>
            </div>
            {index < STAGES.length - 1 && <div className="mx-4 h-px flex-grow bg-[#D5DAD7]" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
