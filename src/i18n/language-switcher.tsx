"use client";

import { m } from "motion/react";
import { type JSX, type KeyboardEvent, useEffect } from "react";
import { htmlLang, type Locale, LOCALES, setLocale, useLocale } from "./locale";

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  pt: "Português (Brasil)",
};

function UsFlag() {
  const stripes = Array.from({ length: 13 }, (_, index) => index);
  return (
    <svg viewBox="0 0 19 10" aria-hidden="true" className="block h-3.5 w-5">
      {stripes.map((index) => (
        <rect
          key={index}
          y={(index * 10) / 13}
          width="19"
          height={10 / 13 + 0.02}
          fill={index % 2 === 0 ? "#b22234" : "#ffffff"}
        />
      ))}
      <rect width="7.6" height={(10 * 7) / 13} fill="#3c3b6e" />
      {[1.2, 2.6, 4].map((y) =>
        [1.1, 2.6, 4.1, 5.6].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.32" fill="#ffffff" />
        )),
      )}
    </svg>
  );
}

function BrazilFlag() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden="true" className="block h-3.5 w-5">
      <rect width="20" height="14" fill="#009c3b" />
      <path d="M10 1.4 18.4 7 10 12.6 1.6 7Z" fill="#ffdf00" />
      <circle cx="10" cy="7" r="3.4" fill="#002776" />
      <path
        d="M6.75 6.1c2.2-.55 4.6-.3 6.55.85"
        stroke="#ffffff"
        strokeWidth="0.7"
        fill="none"
      />
    </svg>
  );
}

const FLAGS: Record<Locale, () => JSX.Element> = {
  en: UsFlag,
  pt: BrazilFlag,
};

/** Page titles come from static metadata, which is English; these are their Portuguese versions. */
const PORTUGUESE_TITLES: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^Anomalies \| HERU$/, () => "Anomalias | HERU"],
  [/^Compare dates \| HERU$/, () => "Comparar datas | HERU"],
  [/^Compare regions \| HERU$/, () => "Comparar regiões | HERU"],
  [/^Map and calendar \| HERU$/, () => "Mapa e calendário | HERU"],
  [/^Calendar \| HERU$/, () => "Calendário | HERU"],
  [/^Methodology \| HERU$/, () => "Metodologia | HERU"],
  [/^Page not found \| HERU$/, () => "Página não encontrada | HERU"],
  [
    /^Understand the problem, (\d+) of (\d+) \| HERU$/,
    (match) => `Entenda o problema, ${match[1]} de ${match[2]} | HERU`,
  ],
];

const ENGLISH_TITLES: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^Anomalias \| HERU$/, () => "Anomalies | HERU"],
  [/^Comparar datas \| HERU$/, () => "Compare dates | HERU"],
  [/^Comparar regiões \| HERU$/, () => "Compare regions | HERU"],
  [/^Mapa e calendário \| HERU$/, () => "Map and calendar | HERU"],
  [/^Calendário \| HERU$/, () => "Calendar | HERU"],
  [/^Metodologia \| HERU$/, () => "Methodology | HERU"],
  [/^Página não encontrada \| HERU$/, () => "Page not found | HERU"],
  [
    /^Entenda o problema, (\d+) de (\d+) \| HERU$/,
    (match) => `Understand the problem, ${match[1]} of ${match[2]} | HERU`,
  ],
];

function translatedTitle(title: string, locale: Locale): string | null {
  for (const [pattern, build] of locale === "pt"
    ? PORTUGUESE_TITLES
    : ENGLISH_TITLES) {
    const match = title.match(pattern);
    if (match) {
      return build(match);
    }
  }
  return null;
}

/**
 * Keeps <html lang> in step with the chosen language, for screen readers and
 * hyphenation, and shows the page title in Portuguese when that is the choice.
 */
export function LocaleDocument() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
    const translateTitle = () => {
      const translated = translatedTitle(document.title, locale);
      if (translated) {
        document.title = translated;
      }
    };
    translateTitle();
    const observer = new MutationObserver(translateTitle);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [locale]);
  return null;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const moveWithArrows = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const index = LOCALES.indexOf(locale);
    const next = LOCALES[(index + step + LOCALES.length) % LOCALES.length];
    setLocale(next);
    event.currentTarget
      .querySelectorAll<HTMLButtonElement>("button")
      [LOCALES.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={locale === "pt" ? "Idioma" : "Language"}
      onKeyDown={moveWithArrows}
      className="flex h-9 items-center gap-0.5 rounded-md border border-line bg-surface-ground/60 p-0.5"
    >
      {LOCALES.map((option) => {
        const checked = option === locale;
        const Flag = FLAGS[option];
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={LANGUAGE_NAMES[option]}
            title={LANGUAGE_NAMES[option]}
            tabIndex={checked ? 0 : -1}
            onClick={() => setLocale(option)}
            className={`relative flex h-7 w-9 cursor-pointer items-center justify-center rounded-sm transition-[opacity,filter] duration-200 ease-standard ${checked ? "" : "opacity-50 saturate-50 hover:opacity-90 hover:saturate-100"}`}
          >
            {checked && (
              <m.span
                key={option}
                aria-hidden="true"
                className="absolute inset-0 rounded-sm bg-surface-raised ring-1 ring-line-strong"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              />
            )}
            <span className="relative overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
              <Flag />
            </span>
          </button>
        );
      })}
    </div>
  );
}
