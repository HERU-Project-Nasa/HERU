"use client";

import { useSyncExternalStore } from "react";
import { formatUpdatedAt } from "@/fire-calendar/calendar-labels";
import { localDateFormat } from "@/i18n/format";
import { useTr } from "@/i18n/locale";
import { useBatchPolling } from "@/pipeline/pipeline-files";

const MINUTE_MS = 60 * 1000;
const STALE_AFTER_MS = 2 * 60 * MINUTE_MS;

const SHORT_DATE_TIME = localDateFormat({
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DAY = localDateFormat({
  day: "2-digit",
  month: "2-digit",
});

const STATUS_DOTS = {
  live: "bg-status-live",
  stale: "bg-status-stale",
  error: "bg-status-error",
} as const;

function everyMinute(listener: () => void) {
  const timer = window.setInterval(listener, MINUTE_MS);
  return () => window.clearInterval(timer);
}

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS);
}

export function DataStatus() {
  const t = useTr();
  const latest = useBatchPolling();
  const minute = useSyncExternalStore(everyMinute, currentMinute, () => 0);
  const updatedAt = latest.rows?.[0]?.updated_at ?? null;
  if (!updatedAt && !latest.error) {
    return null;
  }
  const status = !updatedAt
    ? "error"
    : minute * MINUTE_MS - Date.parse(updatedAt) > STALE_AFTER_MS
      ? "stale"
      : "live";
  const text =
    status === "error"
      ? t("Source offline", "Fonte fora do ar")
      : status === "stale"
        ? t(
            `Data through ${SHORT_DATE_TIME.format(new Date(updatedAt!))}`,
            `Dados até ${SHORT_DATE_TIME.format(new Date(updatedAt!))}`,
          )
        : t("Data up to date", "Dados atualizados");
  const shortText =
    status === "error"
      ? t("Offline", "Fora do ar")
      : status === "stale"
        ? t(
            `Through ${SHORT_DAY.format(new Date(updatedAt!))}`,
            `Até ${SHORT_DAY.format(new Date(updatedAt!))}`,
          )
        : t("Up to date", "Atualizado");
  return (
    <div
      role="status"
      title={
        updatedAt
          ? t(
              `Last batch published on ${formatUpdatedAt(updatedAt)}`,
              `Último lote publicado em ${formatUpdatedAt(updatedAt)}`,
            )
          : t(
              "Could not reach the data source",
              "Não foi possível falar com a fonte dos dados",
            )
      }
      className="type-caption inline-flex h-8 items-center gap-2 rounded-sm bg-surface-raised px-2.5 whitespace-nowrap text-ink lg:px-3"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${STATUS_DOTS[status]}`}
      />
      <span className="lg:hidden">{shortText}</span>
      <span className="hidden lg:inline">{text}</span>
    </div>
  );
}
