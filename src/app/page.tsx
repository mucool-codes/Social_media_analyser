import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { AnalyzerApp } from "@/components/AnalyzerApp";

// Loaded here (not layout.tsx, which S3 doesn't own) so the Stitch design's type scale
// is self-hosted via next/font instead of a runtime Google Fonts <link>.
const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function Home() {
  return (
    <div
      className={`${heading.variable} ${body.variable} ${mono.variable} min-h-screen bg-[#EDF0EE] font-[family-name:var(--font-body)] text-[#14181C]`}
    >
      <AnalyzerApp />
    </div>
  );
}
