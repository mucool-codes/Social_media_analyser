"use client";

import { useState } from "react";
import type { ExtractedDoc } from "@/lib/types";
import { cx } from "@/lib/client/cx";
import { formatBytes, formatDuration } from "@/lib/client/format";
import { CheckIcon, CopyIcon, DownloadIcon, WarningIcon } from "@/components/ui/icons";
import { textBodySmall, textDataMono, textH2, textLabelMono } from "@/components/ui/tokens";

interface ExtractedTextPanelProps {
  /** null renders the loading skeleton (used while validating/extracting). */
  doc: ExtractedDoc | null;
}

const SKELETON_WIDTHS = [100, 95, 85, 90, 100, 70, 88, 60];

export function ExtractedTextPanel({ doc }: ExtractedTextPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(doc.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission denial) — the user
      // can still select and copy the visible text manually, so we just skip the confirmation.
    }
  }

  function handleDownload() {
    if (!doc) return;
    const blob = new Blob([doc.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.meta.fileName.replace(/\.[^./]+$/, "")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-[#D5DAD7] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#D5DAD7] p-4">
        <h2 className={cx(textH2, "text-[16px] text-[#14181C]")}>Extracted text</h2>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!doc}
            className={cx(
              textLabelMono,
              "flex items-center gap-1.5 text-[#5B6672] hover:text-[#14181C] disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!doc}
            className={cx(
              textLabelMono,
              "flex items-center gap-1.5 text-[#5B6672] hover:text-[#14181C] disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <DownloadIcon className="h-4 w-4" />
            Download .txt
          </button>
        </div>
      </div>

      {doc && doc.warnings.length > 0 && (
        <ul className="border-b border-[#D5DAD7] bg-[#FFF8E7]">
          {doc.warnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2 px-4 py-2">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#E0912F]" />
              <span className={cx(textBodySmall, "text-[#14181C]")}>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="min-h-[280px] flex-grow p-4">
        {doc ? (
          doc.pages.map((page, index) => (
            <div key={page.pageNumber}>
              {index > 0 && (
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#D5DAD7]" />
                  </div>
                  <span className={cx(textLabelMono, "relative bg-white px-3 text-[#5B6672]")}>
                    Page {page.pageNumber}
                  </span>
                </div>
              )}
              <pre className={cx(textDataMono, "whitespace-pre-wrap break-words text-[#14181C]")}>{page.text}</pre>
            </div>
          ))
        ) : (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {SKELETON_WIDTHS.map((width, index) => (
              <div key={index} className="h-3 rounded-sm bg-[#D5DAD7]/40" style={{ width: `${width}%` }} />
            ))}
          </div>
        )}
      </div>

      <div
        className={cx(
          textLabelMono,
          "flex flex-wrap gap-x-4 gap-y-1 border-t border-[#D5DAD7] bg-[#EDF0EE] px-4 py-3 text-[#5B6672]",
        )}
      >
        {doc ? (
          <>
            <span>{doc.meta.fileName}</span>
            <span>
              {doc.meta.pageCount} {doc.meta.pageCount === 1 ? "page" : "pages"}
            </span>
            <span>{doc.method === "pdf-parse" ? "PDF" : "OCR"}</span>
            <span>{formatDuration(doc.meta.durationMs)}</span>
            {typeof doc.meta.meanConfidence === "number" && (
              <span>Confidence {Math.round(doc.meta.meanConfidence)}%</span>
            )}
            <span>{formatBytes(doc.meta.sizeBytes)}</span>
          </>
        ) : (
          <span>Waiting for extracted text…</span>
        )}
      </div>
    </div>
  );
}
