"use client";

import {
  AnimatePresence,
  animate,
  m,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { HeruLogo } from "@/brand/heru-logo";
import { useTr } from "@/i18n/locale";
import { StarField } from "@/star-field/star-field";

export const LOADING_MINIMUM_SECONDS = 2;

export function LoadingScreen({
  visible,
  progress,
}: {
  visible: boolean;
  progress: number;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="loading-screen"
          role="status"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-surface-ground"
          exit={{
            opacity: 0,
            transition: { duration: 0.6, ease: [0.4, 0, 1, 1] },
          }}
        >
          <StarField className="absolute inset-0" />
          <span className="relative">
            <HeruLogo variant="loading" />
          </span>
          <LoadingProgress progress={progress} />
        </m.div>
      )}
    </AnimatePresence>
  );
}

function LoadingProgress({ progress }: { progress: number }) {
  const t = useTr();
  const barRef = useRef<HTMLDivElement>(null);
  const elapsed = useMotionValue(0);
  const downloaded = useMotionValue(0);
  const shown = useTransform(() => Math.min(elapsed.get(), downloaded.get()));
  const percent = useTransform(shown, (value) => `${Math.round(value * 100)}%`);

  useEffect(() => {
    const playback = animate(elapsed, 1, {
      duration: LOADING_MINIMUM_SECONDS,
      ease: "linear",
    });
    return () => playback.stop();
  }, [elapsed]);

  useEffect(() => {
    const playback = animate(downloaded, progress, {
      duration: 0.4,
      ease: [0.2, 0, 0, 1],
    });
    return () => playback.stop();
  }, [downloaded, progress]);

  useMotionValueEvent(shown, "change", (value) => {
    barRef.current?.setAttribute(
      "aria-valuenow",
      String(Math.round(value * 100)),
    );
  });

  return (
    <div className="relative flex w-56 flex-col gap-3">
      <div className="type-caption flex justify-between text-ink-muted">
        <span>{t("Loading Earth", "Carregando a Terra")}</span>
        <m.span className="text-ink tabular-nums">{percent}</m.span>
      </div>
      <div
        ref={barRef}
        role="progressbar"
        aria-label={t("Loading Earth", "Carregando a Terra")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className="h-0.5 overflow-hidden rounded-full bg-line"
      >
        <m.div
          className="h-full origin-left rounded-full bg-ink"
          style={{ scaleX: shown }}
        />
      </div>
    </div>
  );
}
