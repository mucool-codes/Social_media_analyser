import type { ExtractedDoc } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/client/cx";
import { formatDuration } from "@/lib/client/format";
import { textDataMono, textLabelMono } from "@/components/ui/tokens";

interface ResultBarProps {
  doc: ExtractedDoc;
  onReset: () => void;
}

export function ResultBar({ doc, onReset }: ResultBarProps) {
  const items = [
    doc.method === "pdf-parse" ? "PDF" : "OCR",
    `${doc.meta.pageCount} ${doc.meta.pageCount === 1 ? "page" : "pages"}`,
    formatDuration(doc.meta.durationMs),
    typeof doc.meta.meanConfidence === "number" ? `Confidence ${Math.round(doc.meta.meanConfidence)}%` : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="flex w-full flex-col items-start justify-between gap-4 rounded-lg border border-[#D5DAD7] bg-white p-4 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cx(textDataMono, "font-semibold text-[#14181C]")}>{doc.meta.fileName}</span>
        {items.map((item) => (
          <span key={item} className="flex items-center gap-3">
            <span className="h-4 w-px bg-[#D5DAD7]" aria-hidden="true" />
            <span className={cx(textLabelMono, "text-[#5B6672]")}>{item}</span>
          </span>
        ))}
      </div>
      <Button variant="secondary" mono onClick={onReset}>
        Analyze another file
      </Button>
    </div>
  );
}
