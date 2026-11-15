"use client";

import { useSyncExternalStore } from "react";
import { formatUpdatedAt } from "@/fire-calendar/calendar-labels";
import {
  type LatestBatchRow,
  usePipelineFile,
} from "@/pipeline/pipeline-files";

const MINUTE_MS = 60 * 1000;
const STALE_AFTER_MS = 24 * 60 * MINUTE_MS;

const STATUS_LOOKS = {
  live: { dot: "bg-status-live", text: "Dados atualizados" },
  stale: { dot: "bg-status-stale", text: "Dados de ontem" },
  error: { dot: "bg-status-error", text: "Fonte fora do ar" },
} as const;

function everyMinute(listener: () => void) {
  const timer = window.setInterval(listener, MINUTE_MS);
  return () => window.clearInterval(timer);
}

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS);
}

export function DataStatus() {
  const latest = usePipelineFile<LatestBatchRow>("meta/latest.csv");
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
  const look = STATUS_LOOKS[status];
  return (
    <div
      role="status"
      title={
        updatedAt
          ? `Último lote recebido em ${formatUpdatedAt(updatedAt)}`
          : "Não foi possível falar com a fonte dos dados"
      }
      className="type-caption inline-flex h-8 items-center gap-2 rounded-sm bg-surface-raised px-3 whitespace-nowrap text-ink"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${look.dot}`}
      />
      {look.text}
    </div>
  );
}
