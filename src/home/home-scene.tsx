"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/button/button-class-name";
import { GlobeSlot } from "@/earth-globe/globe-slot";
import {
  globeLoadingSnapshot,
  useGlobeLoading,
} from "@/earth-globe/globe-store";
import {
  LOADING_MINIMUM_SECONDS,
  LoadingScreen,
} from "@/loading-screen/loading-screen";
import { StarField } from "@/star-field/star-field";

const EASE_STANDARD = [0.2, 0, 0, 1] as const;

const RISE = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_STANDARD },
  },
};

const HERO = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const ACTIONS = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_STANDARD, delay: 0.55 },
  },
};

export function HomeScene() {
  const { progress, ready } = useGlobeLoading();
  const [minimumElapsed, setMinimumElapsed] = useState(
    () => globeLoadingSnapshot().ready,
  );
  const revealed = ready && minimumElapsed;
  const stage = revealed ? "visible" : "hidden";

  useEffect(() => {
    if (minimumElapsed) {
      return;
    }
    const timer = window.setTimeout(
      () => setMinimumElapsed(true),
      LOADING_MINIMUM_SECONDS * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [minimumElapsed]);

  return (
    <>
      <StarField className="fixed inset-0 -z-10" />
      <main className="relative h-[calc(100svh-4rem)] min-h-[560px] overflow-hidden lg:h-[calc(100svh-5rem)]">
        <m.section
          aria-labelledby="hero-title"
          className="relative z-[2] flex flex-col items-center px-6 pt-6 text-center lg:px-16 lg:pt-10"
          initial="hidden"
          animate={stage}
          variants={HERO}
        >
          <m.div
            variants={RISE}
            className="flex w-full max-w-[820px] items-center justify-center gap-6"
          >
            <span
              aria-hidden="true"
              className="hidden h-px flex-1 bg-line lg:block"
            />
            <p className="type-eyebrow text-ink-muted">
              Harmonizando as fontes de calor
            </p>
            <span
              aria-hidden="true"
              className="hidden h-px flex-1 bg-line lg:block"
            />
          </m.div>
          <h1 id="hero-title" className="mt-2 flex flex-col items-center">
            <m.span
              variants={RISE}
              className="type-heading-lg lg:type-heading-xl"
            >
              que MODIS e VIIRS viram na
            </m.span>
            <m.span
              variants={RISE}
              className="type-display-hero mt-3 bg-linear-to-b from-ink from-28% to-ink/0 to-92% bg-clip-text pl-[0.08em] text-[96px] tracking-[0.08em] text-transparent lg:mt-4 lg:pl-[0.16em] lg:text-[200px] lg:tracking-[0.16em]"
            >
              Terra
            </m.span>
          </h1>
        </m.section>
        <GlobeSlot
          className="top-[172px] left-1/2 -ml-[330px] w-[660px] lg:top-[182px] lg:-ml-[min(41vw,590px)] lg:w-[min(82vw,1180px)]"
          visible={revealed}
        />
        <m.div
          className="absolute inset-x-6 bottom-8 z-[5] flex flex-col gap-4 sm:inset-x-0 sm:bottom-14 sm:items-center sm:gap-5 sm:px-6"
          initial="hidden"
          animate={stage}
          variants={ACTIONS}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
            <Link
              href="/onboarding/1"
              className={buttonClassName({ variant: "primary", size: "lg" })}
            >
              Entenda o problema
            </Link>
            <Link
              href="/calendar"
              className={buttonClassName({
                variant: "secondary",
                size: "lg",
              })}
            >
              Escolher uma região
            </Link>
          </div>
          <p className="type-caption text-center text-ink-muted">
            MODIS desde 2003 · VIIRS desde 2012
            <span className="max-sm:hidden"> · uma só escala</span>
          </p>
        </m.div>
      </main>
      <LoadingScreen visible={!revealed} progress={progress} />
    </>
  );
}
