"use client";

import { AnimatePresence, m, type Variants } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { AnimatedNumber, EASE_STANDARD } from "@/motion/chart-motion";

const BACKDROP: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.05 } },
};

const PANEL: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: EASE_STANDARD,
      delayChildren: 0.12,
      staggerChildren: 0.07,
    },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.98,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const BLOCK: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_STANDARD },
  },
};

export type ChipTone = "above" | "below" | "neutral";

const CHIP_TONES: Record<ChipTone, string> = {
  above: "bg-tint-alert text-delta-above",
  below: "bg-tint-info text-delta-below",
  neutral: "bg-surface-raised text-ink",
};

export function EvidenceChip({
  icon,
  tone = "neutral",
  children,
}: {
  icon?: SymbolName;
  tone?: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`type-body-sm inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-semibold tabular-nums ${CHIP_TONES[tone]}`}
    >
      {icon && <MaterialSymbol name={icon} className="size-4 shrink-0" />}
      {children}
    </span>
  );
}

export function EvidenceStat({
  label,
  value,
  format,
  unit,
  children,
}: {
  label: string;
  value: number | string;
  format?: (value: number) => string;
  unit: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-hover px-5 py-4">
      <p className="type-eyebrow text-ink-muted">{label}</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="type-stat-xl text-ink">
          {typeof value === "number" && format ? (
            <AnimatedNumber value={value} format={format} />
          ) : (
            value
          )}
        </span>
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
  summary,
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
  summary: ReactNode;
  note: string;
  onDownload: () => void;
  onShow: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(true);
  const afterClose = useRef(onClose);
  const close = (then: () => void = onClose) => {
    afterClose.current = then;
    setOpen(false);
  };

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
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-transparent p-4 text-ink backdrop:bg-transparent"
    >
      <AnimatePresence
        onExitComplete={() => {
          dialogRef.current?.close();
          afterClose.current();
        }}
      >
        {open && (
          <m.div
            key="evidence"
            className="flex min-h-full items-center justify-center"
            initial="hidden"
            animate="shown"
            exit="exit"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                close();
              }
            }}
          >
            <m.div
              aria-hidden="true"
              className="fixed inset-0 bg-surface-ground/72 backdrop-blur-[2px]"
              variants={BACKDROP}
              onClick={() => close()}
            />
            <m.div
              variants={PANEL}
              className="relative w-[680px] max-w-full rounded-lg border border-line bg-surface shadow-overlay"
            >
              <div className="flex flex-col gap-6 p-6 sm:p-8">
                <m.div variants={BLOCK} className="flex flex-col gap-2">
                  <div className="-mt-2 -mr-2 flex items-center justify-between gap-3">
                    <p className="type-eyebrow flex items-center gap-2 text-ink-muted">
                      <MaterialSymbol
                        name={icon}
                        className="size-[18px] shrink-0"
                      />
                      {eyebrow}
                    </p>
                    <button
                      type="button"
                      aria-label="Fechar"
                      onClick={() => close()}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink transition-colors duration-120 ease-standard hover:bg-surface-hover"
                    >
                      <MaterialSymbol name="close" className="size-5" />
                    </button>
                  </div>
                  <h2 id="evidence-title" className="type-heading-md text-ink">
                    {title}
                  </h2>
                  <p className="type-body text-ink-muted">{lead}</p>
                </m.div>
                {summary && (
                  <m.div variants={BLOCK} className="flex flex-wrap gap-2">
                    {summary}
                  </m.div>
                )}
                <m.div variants={BLOCK} className="flex flex-col gap-6">
                  {children}
                </m.div>
                <m.div
                  variants={BLOCK}
                  className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"
                >
                  <span className="type-body-sm text-ink-muted">{note}</span>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onDownload}
                      className={buttonClassName({
                        variant: "secondary",
                        size: "md",
                      })}
                    >
                      <MaterialSymbol name="download" className="size-[18px]" />
                      Baixar CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => close(onShow)}
                      className={buttonClassName({
                        variant: "primary",
                        size: "md",
                      })}
                    >
                      Ver no calendário
                      <MaterialSymbol
                        name="arrow_forward"
                        className="size-[18px]"
                      />
                    </button>
                  </div>
                </m.div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
