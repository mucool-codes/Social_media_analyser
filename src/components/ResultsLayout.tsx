import type { ReactNode } from "react";

interface ResultsLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function ResultsLayout({ left, right }: ResultsLayoutProps) {
  return (
    <div className="flex w-full flex-col items-stretch gap-6 md:flex-row">
      <div className="w-full md:w-[58%]">{left}</div>
      <div className="w-full md:w-[42%]">{right}</div>
    </div>
  );
}
