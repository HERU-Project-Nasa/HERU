import { currentLocale, intlLocale } from "./locale";

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** A number formatter that formats in the active language at call time. */
export function localNumberFormat(options: Intl.NumberFormatOptions = {}) {
  const key = JSON.stringify(options);
  const formatter = () => {
    const id = `${currentLocale()}|${key}`;
    let format = numberFormats.get(id);
    if (!format) {
      format = new Intl.NumberFormat(intlLocale(), options);
      numberFormats.set(id, format);
    }
    return format;
  };
  return { format: (value: number) => formatter().format(value) };
}

/** A date formatter that formats in the active language at call time. */
export function localDateFormat(options: Intl.DateTimeFormatOptions = {}) {
  const key = JSON.stringify(options);
  const formatter = () => {
    const id = `${currentLocale()}|${key}`;
    let format = dateFormats.get(id);
    if (!format) {
      format = new Intl.DateTimeFormat(intlLocale(), options);
      dateFormats.set(id, format);
    }
    return format;
  };
  return {
    format: (date: Date | number) => formatter().format(date),
    formatToParts: (date: Date | number) => formatter().formatToParts(date),
  };
}

/** Sorts labels the way a reader of the active language expects. */
export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, intlLocale());
}
