"use client";

import { useSyncExternalStore } from "react";
import { formatUpdatedAt } from "@/fire-calendar/calendar-labels";
import { useBatchPolling } from "@/pipeline/pipeline-files";

const MINUTE_MS = 60 * 1000;
const STALE_AFTER_MS = 2 * 60 * MINUTE_MS;

const SHORT_DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
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
      ? "Fonte fora do ar"
      : status === "stale"
        ? `Dados até ${SHORT_DATE_TIME.format(new Date(updatedAt!))}`
        : "Dados atualizados";
  return (
    <div
      role="status"
      title={
        updatedAt
          ? `Último lote publicado em ${formatUpdatedAt(updatedAt)}`
          : "Não foi possível falar com a fonte dos dados"
      }
      className="type-caption inline-flex h-8 items-center gap-2 rounded-sm bg-surface-raised px-3 whitespace-nowrap text-ink"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${STATUS_DOTS[status]}`}
      />
      {text}
    </div>
  );
}
