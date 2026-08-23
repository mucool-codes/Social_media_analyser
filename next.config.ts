import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdf-parse (pdfjs-dist) resolves its worker file relative to the compiled
  // module at runtime. Bundling it into the route's webpack chunk breaks that
  // resolution — keep it as a real node_modules import instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
