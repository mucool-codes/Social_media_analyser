import { cx } from "@/lib/client/cx";
import { textLabelMono } from "@/components/ui/tokens";

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-[#D5DAD7] bg-[#EDF0EE] px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 md:flex-row">
        <p className={cx(textLabelMono, "text-[#5B6672]")}>Built with Next.js · pdf-parse · Tesseract.js</p>
      </div>
    </footer>
  );
}
