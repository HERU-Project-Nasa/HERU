import { useSyncExternalStore } from "react";

export type Locale = "en" | "pt";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: Locale[] = ["en", "pt"];

const STORAGE_KEY = "heru:locale";
const INTL_LOCALES: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };
const HTML_LANGS: Record<Locale, string> = { en: "en", pt: "pt-BR" };

const listeners = new Set<() => void>();
let chosen: Locale | null = null;

/**
 * The locale of the component rendering right now. The site is a static
 * export, so the server and the first client render always use English;
 * every component that shows text calls useLocale(), which re-renders it in
 * the visitor's language right after hydration. Helpers outside React (label
 * builders, formatters) read this value, so they speak the language of the
 * component that called them.
 */
let activeLocale: Locale = DEFAULT_LOCALE;

function readChosen(): Locale {
  if (chosen === null) {
    try {
      chosen = window.localStorage.getItem(STORAGE_KEY) === "pt" ? "pt" : "en";
    } catch {
      chosen = DEFAULT_LOCALE;
    }
  }
  return chosen;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      chosen = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLocale(next: Locale) {
  chosen = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Records the language of the component about to render its text. It is
 * idempotent for a given render, so React may repeat it safely.
 */
function renderIn(locale: Locale) {
  activeLocale = locale;
}

export function useLocale(): Locale {
  const locale = useSyncExternalStore(
    subscribe,
    readChosen,
    () => DEFAULT_LOCALE,
  );
  renderIn(locale);
  return locale;
}

/** Runs code outside React (tests, scripts) in a given language. */
export function inLocale<T>(locale: Locale, run: () => T): T {
  const previous = activeLocale;
  activeLocale = locale;
  try {
    return run();
  } finally {
    activeLocale = previous;
  }
}

/** Picks the English or Portuguese text, inside or outside React. */
export function tr<T = string>(en: T, pt: T): T {
  return activeLocale === "pt" ? pt : en;
}

/** Subscribes the component to the language and returns the picker. */
export function useTr(): <T = string>(en: T, pt: T) => T {
  const locale = useLocale();
  return (en, pt) => (locale === "pt" ? pt : en);
}

export function currentLocale(): Locale {
  return activeLocale;
}

export function intlLocale(locale: Locale = activeLocale): string {
  return INTL_LOCALES[locale];
}

export function htmlLang(locale: Locale): string {
  return HTML_LANGS[locale];
}

/**
 * A constant (array or record) whose content follows the language. Reads go
 * to the English or Portuguese value at the moment they happen, so existing
 * call sites such as MONTH_NAMES[month] keep working unchanged.
 */
export function localized<T extends object>(en: T, pt: T): T {
  const pick = () => (activeLocale === "pt" ? pt : en);
  const target = (Array.isArray(en) ? [...en] : { ...en }) as T;
  return new Proxy(target, {
    get: (_, key) => {
      const source = pick();
      const value = Reflect.get(source, key);
      return typeof value === "function" ? value.bind(source) : value;
    },
    has: (_, key) => Reflect.has(pick(), key),
    ownKeys: () => Reflect.ownKeys(pick()),
    getOwnPropertyDescriptor: (_, key) =>
      Reflect.getOwnPropertyDescriptor(pick(), key),
  });
}
