"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { EASE_STANDARD } from "@/motion/chart-motion";

export const METHODOLOGY_SECTIONS = [
  { id: "foco", title: "O que é um foco de calor", label: null },
  { id: "fontes", title: "Fontes de dados", label: null },
  { id: "filtragem", title: "Filtragem", label: null },
  { id: "harmonizacao", title: "Harmonização", label: null },
  { id: "validacao", title: "Validação", label: null },
  { id: "creditos", title: "Créditos", label: null },
] as const;

export type MethodologySectionId = (typeof METHODOLOGY_SECTIONS)[number]["id"];

export function MethodologySection({
  id,
  children,
}: {
  id: MethodologySectionId;
  children: ReactNode;
}) {
  const index = METHODOLOGY_SECTIONS.findIndex((section) => section.id === id);
  return (
    <m.section
      aria-labelledby={id}
      className="relative flex flex-col gap-4 pt-10"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.6, ease: EASE_STANDARD }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-line"
      >
        <m.span
          className="absolute inset-y-0 left-0 w-full origin-left bg-ink-muted"
          initial={{ scaleX: 0, opacity: 1 }}
          whileInView={{ scaleX: 1, opacity: 0 }}
          viewport={{ once: true }}
          transition={{
            scaleX: { duration: 0.9, ease: EASE_STANDARD },
            opacity: { duration: 0.6, delay: 0.9 },
          }}
        />
      </span>
      <h2
        id={id}
        className="type-heading-md flex scroll-mt-8 items-baseline gap-3 text-ink"
      >
        <span className="type-caption text-ink-muted tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        {METHODOLOGY_SECTIONS[index].title}
      </h2>
      {children}
    </m.section>
  );
}
