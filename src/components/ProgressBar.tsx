"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/client/cx";
import { textLabelMono } from "@/components/ui/tokens";

interface ProgressBarProps {
  label: string;
  /** 0-100. Omit for an indeterminate bar (used whenever we can't report a real percentage). */
  progress?: number;
}

function useIndeterminateSweep(active: boolean): boolean {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (!active) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = setInterval(() => setAtEnd((value) => !value), 900);
    return () => clearInterval(id);
  }, [active]);

  return atEnd;
}

export function ProgressBar({ label, progress }: ProgressBarProps) {
  const determinate = typeof progress === "number";
  const clamped = determinate ? Math.max(0, Math.min(100, progress)) : 0;
  const sweepAtEnd = useIndeterminateSweep(!determinate);

  return (
    <div
      className="flex w-full flex-col gap-2"
      role="progressbar"
      aria-valuetext={determinate ? `${label} — ${Math.round(clamped)}%` : label}
      aria-valuenow={determinate ? Math.round(clamped) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[#D5DAD7]">
        {determinate ? (
          <div
            className="h-full bg-[#D8F252] transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
            style={{ width: `${clamped}%` }}
          />
        ) : (
          <div
            className={cx(
              "h-full w-1/3 bg-[#D8F252] transition-transform duration-[900ms] ease-in-out motion-reduce:transition-none",
              sweepAtEnd ? "translate-x-[200%]" : "translate-x-0",
            )}
          />
        )}
      </div>
      <div className={cx(textLabelMono, "flex w-full justify-between text-[#14181C]")}>
        <span>{label}</span>
        {determinate && <span>{Math.round(clamped)}%</span>}
      </div>
    </div>
  );
}
