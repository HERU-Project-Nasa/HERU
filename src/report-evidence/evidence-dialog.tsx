"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";

export function EvidenceStat({
  label,
  value,
  unit,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-hover px-5 py-4">
      <p className="type-eyebrow text-ink-muted">{label}</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="type-stat-xl text-ink">{value}</span>
        <span className="type-body-sm text-ink-muted">{unit}</span>
      </p>
      {children}
    </div>
  );
}

export function EvidenceDialog({
  eyebrow,
  icon,
  title,
  lead,
  note,
  onDownload,
  onShow,
  onClose,
  children,
}: {
  eyebrow: string;
  icon: SymbolName;
  title: string;
  lead: string;
  note: string;
  onDownload: () => void;
  onShow: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="evidence-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[640px] max-w-[calc(100%-32px)] overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink shadow-overlay backdrop:bg-surface-ground/72"
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <div className="-mt-2 -mr-2 flex items-center justify-between gap-3">
            <p className="type-eyebrow flex items-center gap-2 text-ink-muted">
              <MaterialSymbol name={icon} className="size-[18px] shrink-0" />
              {eyebrow}
            </p>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink transition-colors duration-120 ease-standard hover:bg-surface-hover"
            >
              <MaterialSymbol name="close" className="size-5" />
            </button>
          </div>
          <h2 id="evidence-title" className="type-heading-md text-ink">
            {title}
          </h2>
          <p className="type-body text-ink-muted">{lead}</p>
        </div>
        {children}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <span className="type-body-sm text-ink-muted">{note}</span>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDownload}
              className={buttonClassName({ variant: "secondary", size: "md" })}
            >
              <MaterialSymbol name="download" className="size-[18px]" />
              Baixar CSV
            </button>
            <button
              type="button"
              onClick={onShow}
              className={buttonClassName({ variant: "primary", size: "md" })}
            >
              Ver no calendário
              <MaterialSymbol name="arrow_forward" className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
