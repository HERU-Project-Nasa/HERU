"use client";

import type { ReactNode } from "react";
import { useTr } from "@/i18n/locale";

/**
 * Text written in a server component. Both languages travel to the client and
 * this picks the visitor's one, so the server page can keep its static layout
 * while the words follow the language switcher.
 */
export function LocalizedText({ en, pt }: { en: ReactNode; pt: ReactNode }) {
  const t = useTr();
  return <>{t(en, pt)}</>;
}
