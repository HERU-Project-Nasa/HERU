import type { Metadata } from "next";
import { SiteFooter } from "@/layout/site-footer";
import { SiteHeader } from "@/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fire Calendar",
  description:
    "Weekly burning activity from MODIS and VIIRS hot spots, harmonized into one record since 2003.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
