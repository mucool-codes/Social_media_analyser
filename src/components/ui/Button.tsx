import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/client/cx";
import { textBodyMedium, textLabelMono } from "@/components/ui/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Use the uppercase mono label style instead of body-medium (matches the Stitch UI chrome). */
  mono?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-[#D8F252] text-[#14181C] border border-[#14181C] hover:bg-[#b9d234]",
  secondary: "bg-white text-[#14181C] border border-[#D5DAD7] hover:border-[#14181C]",
  ghost: "bg-transparent text-[#5B6672] border border-transparent hover:text-[#14181C]",
};

export function Button({ variant = "secondary", mono = false, className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded px-4 py-2 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14181C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EDF0EE]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        mono ? textLabelMono : textBodyMedium,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
