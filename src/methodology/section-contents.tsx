"use client";

import { useEffect, useState } from "react";
import { useTr } from "@/i18n/locale";
import { METHODOLOGY_SECTIONS } from "./methodology-sections";

const ACTIVE_LINE = 0.3;

export function SectionContents() {
  const t = useTr();
  const [currentId, setCurrentId] = useState<string>(
    METHODOLOGY_SECTIONS[0].id,
  );

  useEffect(() => {
    const headings = METHODOLOGY_SECTIONS.flatMap(({ id }) => {
      const heading = document.getElementById(id);
      return heading ? [heading] : [];
    });
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrolledToEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (scrolledToEnd) {
        setCurrentId(headings[headings.length - 1].id);
        return;
      }
      const activeLine = window.innerHeight * ACTIVE_LINE;
      const passed = headings.filter(
        (heading) => heading.getBoundingClientRect().top <= activeLine,
      );
      setCurrentId((passed.at(-1) ?? headings[0]).id);
    };
    const scheduleUpdate = () => {
      frame ||= requestAnimationFrame(update);
    };
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <nav
      aria-label={t("On this page", "Nesta página")}
      className="max-lg:hidden"
    >
      <p className="type-caption mb-2 text-ink-muted">
        {t("On this page", "Nesta página")}
      </p>
      <ol>
        {METHODOLOGY_SECTIONS.map(({ id, title, label }) => {
          const current = id === currentId;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={current ? "location" : undefined}
                className={`type-body-sm flex items-center gap-2.5 py-2 transition-colors duration-120 ease-standard hover:text-ink ${current ? "font-semibold text-ink" : "text-ink-muted"}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full border ${current ? "border-ink bg-ink" : "border-line-strong"}`}
                />
                {label ?? title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
