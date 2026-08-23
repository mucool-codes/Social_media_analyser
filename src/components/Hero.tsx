import { cx } from "@/lib/client/cx";
import { textBodyMain, textH1, textLabelMono } from "@/components/ui/tokens";

export function Hero() {
  return (
    <section className="max-w-[640px]">
      <p className={cx(textLabelMono, "mb-2 text-[#5B6672]")}>PDF parsing · OCR · Engagement analysis</p>
      <h1 className={cx(textH1, "mb-4 text-[#14181C]")}>Read the post. Then improve it.</h1>
      <p className={cx(textBodyMain, "text-[#5B6672]")}>
        Upload a PDF or a photo of a social media post. The text comes out formatted, and you get
        specific suggestions for engagement.
      </p>
    </section>
  );
}
