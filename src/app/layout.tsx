import type { Metadata } from "next";
import { Barlow, Outfit } from "next/font/google";
import { GlobeStage } from "@/earth-globe/globe-stage";
import { SiteFooter } from "@/layout/site-footer";
import { SiteHeader } from "@/layout/site-header";
import { LocaleDocument } from "@/i18n/language-switcher";
import { MotionProvider } from "@/motion/motion-provider";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-barlow",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "600"],
  variable: "--font-outfit",
});

const DESCRIPTION =
  "Heat sources seen by the MODIS and VIIRS sensors, harmonized onto a single scale since 2003.";

export const metadata: Metadata = {
  metadataBase: new URL("https://heruproject.io"),
  title: "HERU",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "HERU",
    locale: "en_US",
    alternateLocale: ["pt_BR"],
    title: "HERU",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${barlow.variable} ${outfit.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <MotionProvider>
          <LocaleDocument />
          <GlobeStage />
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
