import type { ReactNode } from "react";

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
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 border-t border-line pt-10"
    >
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
    </section>
  );
}
