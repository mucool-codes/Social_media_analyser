"use client";

import { useCallback, useId } from "react";
import { ErrorCode, useDropzone, type FileRejection } from "react-dropzone";
import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/config";
import { cx } from "@/lib/client/cx";
import { DocumentIcon } from "@/components/ui/icons";
import { textBodySmall, textH2, textLabelMono } from "@/components/ui/tokens";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  /** Called instead of onFileSelected when the drop itself is invalid — currently
   * only "more than one file dropped at once", which react-dropzone otherwise
   * discards silently rather than rejecting. */
  onRejected: (message: string) => void;
  disabled?: boolean;
  /** "error" keeps the rejecting (red) styling even when not actively dragging. */
  tone?: "default" | "error";
}

type AcceptedMime = (typeof ACCEPTED_MIME)[number];

const EXTENSIONS: Record<AcceptedMime, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

const FRIENDLY_LABEL: Record<AcceptedMime, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

const ACCEPT = Object.fromEntries(ACCEPTED_MIME.map((mime) => [mime, EXTENSIONS[mime]]));
const ACCEPTED_LABEL = ACCEPTED_MIME.map((mime) => FRIENDLY_LABEL[mime]).join(" · ");
const MAX_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

export function Dropzone({ onFileSelected, onRejected, disabled = false, tone = "default" }: DropzoneProps) {
  const describedById = useId();

  const handleDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const tooManyFiles = fileRejections.some((r) => r.errors.some((e) => e.code === ErrorCode.TooManyFiles));
      if (tooManyFiles) {
        onRejected("Please upload one file at a time.");
        return;
      }
      const file = acceptedFiles[0] ?? fileRejections[0]?.file;
      if (file) onFileSelected(file);
    },
    [onFileSelected, onRejected],
  );

  // multiple:true (rather than react-dropzone's usual multiple:false + maxFiles:1
  // combo) so a multi-file drop actually reaches onDrop as a real rejection instead
  // of silently being truncated to the first file before rejection checks run.
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPT,
    maxSize: MAX_FILE_BYTES,
    maxFiles: 1,
    multiple: true,
    disabled,
  });

  const rejecting = tone === "error" || isDragReject;

  const rootProps = getRootProps({
    role: "button",
    "aria-label": "Upload a PDF or image of a social media post",
    "aria-describedby": describedById,
    "aria-disabled": disabled,
  });

  return (
    <section
      {...rootProps}
      className={cx(
        "group relative flex h-[320px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14181C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EDF0EE]",
        rejecting
          ? "border-[#C8402F] bg-[#C8402F]/5"
          : isDragActive
            ? "border-[#14181C] bg-[#f7faf8]"
            : "border-[#D5DAD7] bg-white hover:bg-[#f7faf8]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input {...getInputProps()} />

      <Bracket position="top-4 left-4 border-t-2 border-l-2" rejecting={rejecting} />
      <Bracket position="top-4 right-4 border-t-2 border-r-2" rejecting={rejecting} />
      <Bracket position="bottom-4 left-4 border-b-2 border-l-2" rejecting={rejecting} />
      <Bracket position="bottom-4 right-4 border-b-2 border-r-2" rejecting={rejecting} />

      <DocumentIcon className="mb-4 h-12 w-12 text-[#5B6672]" />

      <h2 className={cx(textH2, "mb-1 text-[#14181C]")}>Drop a file here</h2>
      <p className={cx(textBodySmall, "mb-6 text-[#5B6672]")}>or click to browse</p>

      <span
        className={cx(
          "mb-2 inline-flex min-h-[44px] items-center justify-center rounded border border-[#14181C] bg-[#D8F252] px-4 py-2 transition-colors group-hover:bg-[#b9d234]",
          textBodySmall,
          "text-[#14181C]",
        )}
      >
        Choose file
      </span>

      <p id={describedById} className={cx(textLabelMono, "text-[#5B6672]")}>
        {ACCEPTED_LABEL} — max {MAX_MB} MB
      </p>
    </section>
  );
}

function Bracket({ position, rejecting }: { position: string; rejecting: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx("absolute h-6 w-6", position, rejecting ? "border-[#C8402F]" : "border-[#14181C]")}
    />
  );
}
