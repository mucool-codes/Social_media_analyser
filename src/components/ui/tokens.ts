// Shared class fragments so every component references the same Space Grotesk /
// Inter / IBM Plex Mono type scale from the Stitch design without repeating the
// arbitrary-value strings everywhere. The CSS vars are set once in src/app/page.tsx
// via next/font, since tailwind.config.ts and layout.tsx are outside this session's
// file ownership — see the end-of-session summary for the tradeoff.
export const fontHeading = "font-[family-name:var(--font-heading)]";
export const fontBody = "font-[family-name:var(--font-body)]";
export const fontMono = "font-[family-name:var(--font-mono)]";

export const textH1 = `${fontHeading} font-semibold text-[28px] md:text-[32px] leading-[1.2] tracking-[-0.02em]`;
export const textH2 = `${fontHeading} font-semibold text-[20px] leading-[1.4] tracking-[-0.01em]`;
export const textBodyMain = `${fontBody} text-base leading-[1.5]`;
export const textBodyMedium = `${fontBody} text-base font-medium leading-[1.5]`;
export const textBodySmall = `${fontBody} text-sm leading-[1.4]`;
export const textLabelMono = `${fontMono} text-xs uppercase tracking-[0.08em]`;
export const textDataMono = `${fontMono} text-sm leading-[1.4]`;
