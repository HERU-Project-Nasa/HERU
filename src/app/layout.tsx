import type { Metadata } from "next";
import { Barlow, Outfit } from "next/font/google";
import { GlobeStage } from "@/earth-globe/globe-stage";
import { SiteFooter } from "@/layout/site-footer";
import { SiteHeader } from "@/layout/site-header";
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

<<<<<<< HEAD
const DESCRIPTION =
  "Queimadas vistas pelos sensores MODIS e VIIRS, harmonizadas em uma só escala desde 2003.";

export const metadata: Metadata = {
  metadataBase: new URL("https://heruproject.io"),
  title: "HERU",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "HERU",
    locale: "pt_BR",
    title: "HERU",
    description: DESCRIPTION,
  },
=======
export const metadata: Metadata = {
  title: "HERU",
  description:
    "Queimadas vistas pelos sensores MODIS e VIIRS, harmonizadas em uma só escala desde 2003.",
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${barlow.variable} ${outfit.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <MotionProvider>
          <GlobeStage />
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
