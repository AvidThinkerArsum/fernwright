import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { lineworkFile } from "@/lib/lineworkKey";
import { SITE, where } from "@/lib/site";
import { Providers } from "@/components/Providers";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${SITE.name} · Design-build remodeling in ${where()}`,
  description: `We draw it, then we build exactly that. Fixed-price kitchen, bath and whole-floor remodels on ${SITE.region}, from ${SITE.name} of ${where()}.`,
};

export const viewport: Viewport = {
  themeColor: "#f1ece2",
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plex.variable} ${geist.variable}`}>
      <head>
        {/* The hero drawing ships precomputed; fetch it alongside the JS so the sheet plots on first paint. */}
        <link rel="preload" href={`${BASE}/${lineworkFile(SITE.hero.photo.id, SITE.hero.engine, 1200)}`} as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
