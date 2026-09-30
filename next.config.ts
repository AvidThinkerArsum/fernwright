import type { NextConfig } from "next";

// Static export for Cloudflare Pages / GitHub Pages. Set BASE_PATH=/fernwright when the
// site lives under a sub-path (GitHub Pages project sites); leave it unset for a root domain.
const basePath = process.env.BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  // Inlined at build time so server HTML and client agree.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath ?? "",
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  turbopack: { root: __dirname },
};

export default nextConfig;
