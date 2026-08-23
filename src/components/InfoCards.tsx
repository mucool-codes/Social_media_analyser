import { cx } from "@/lib/client/cx";
import { textBodySmall, textDataMono, textH2 } from "@/components/ui/tokens";

const STEPS = [
  { number: "01", title: "Upload", body: "Provide an image or PDF of your social media content." },
  { number: "02", title: "Extract", body: "We pull the text out with PDF parsing or OCR." },
  { number: "03", title: "Improve", body: "Get actionable suggestions to boost engagement." },
] as const;

export function InfoCards() {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {STEPS.map((step) => (
        <div key={step.number} className="flex flex-col gap-2 rounded border border-[#D5DAD7] bg-white p-6">
          <span className={cx(textDataMono, "text-[#5B6672]")}>{step.number}</span>
          <h3 className={cx(textH2, "text-[16px] text-[#14181C]")}>{step.title}</h3>
          <p className={cx(textBodySmall, "mt-1 text-[#5B6672]")}>{step.body}</p>
        </div>
      ))}
    </section>
  );
}
