import { cx } from "@/lib/client/cx";
import { textH2, textLabelMono } from "@/components/ui/tokens";

export function TopNav() {
  return (
    <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#D5DAD7] bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-[#D8F252]" aria-hidden="true">
          <span className="text-[10px] font-bold text-[#14181C]">CA</span>
        </div>
        <span className={cx(textH2, "text-[#14181C]")}>Content Analyzer</span>
      </div>
      <div className="flex items-center gap-6">
        <a
          href="#"
          className={cx(
            textLabelMono,
            "text-[#14181C] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14181C]",
          )}
        >
          GitHub
        </a>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D5B]" aria-hidden="true" />
          <span className={cx(textLabelMono, "text-[#5B6672]")}>Analysis online</span>
        </div>
      </div>
    </header>
  );
}
