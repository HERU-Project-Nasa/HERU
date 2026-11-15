"use client";

import { m } from "motion/react";
import Link from "next/link";
import { buttonClassName } from "@/button/button-class-name";
import { GlobeSlot } from "@/earth-globe/globe-slot";
import { useTr } from "@/i18n/locale";
import { MaterialSymbol } from "@/icons/material-symbols";
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

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

export function NotFoundScene() {
  const t = useTr();
  return (
    <>
      <StarField className="fixed inset-0 -z-10" />
      <main className="relative h-[calc(100svh-4rem)] min-h-[560px] overflow-hidden lg:h-[calc(100svh-5rem)]">
        <m.section
          aria-labelledby="not-found-title"
          className="relative z-[5] flex flex-col items-center px-6 pt-6 text-center lg:px-16 lg:pt-10"
          initial="hidden"
          animate="visible"
          variants={STAGGER}
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
              {t("Error 404 · Signal lost", "Erro 404 · Sinal perdido")}
            </p>
            <span
              aria-hidden="true"
              className="hidden h-px flex-1 bg-line lg:block"
            />
          </m.div>
          <h1 id="not-found-title" className="mt-2 flex flex-col items-center">
            <m.span
              variants={RISE}
              className="type-heading-lg lg:type-heading-xl"
            >
              {t("This page has left orbit", "Esta página saiu da órbita")}
            </m.span>
            <m.span
              variants={RISE}
              aria-hidden="true"
              className="type-display-hero mt-3 bg-linear-to-b from-ink from-28% to-ink/0 to-92% bg-clip-text pl-[0.08em] text-[120px] tracking-[0.08em] text-transparent lg:mt-4 lg:pl-[0.16em] lg:text-[200px] lg:tracking-[0.16em]"
            >
              404
            </m.span>
          </h1>
          <m.p
            variants={RISE}
            className="type-body-lg mt-2 max-w-[520px] text-ink-muted"
          >
            {t(
              "We searched every satellite overpass and found nothing at this address. Maybe the link is wrong or the page has moved.",
              "Procuramos em todas as passagens dos satélites e não encontramos nada neste endereço. Talvez o link esteja errado ou a página tenha mudado de lugar.",
            )}
          </m.p>
        </m.section>
        <GlobeSlot
          className="top-[360px] left-1/2 -ml-[330px] w-[660px] lg:top-[360px] lg:-ml-[min(41vw,590px)] lg:w-[min(82vw,1180px)]"
          visible
        />
        <m.div
          className="absolute inset-x-6 bottom-8 z-[5] flex flex-col gap-3 sm:inset-x-0 sm:bottom-14 sm:flex-row sm:justify-center sm:gap-4 sm:px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_STANDARD, delay: 0.55 }}
        >
          <Link
            href="/"
            className={buttonClassName({ variant: "primary", size: "lg" })}
          >
            <MaterialSymbol name="arrow_back" className="size-[18px]" />
            {t("Back to home", "Voltar ao início")}
          </Link>
          <Link
            href="/onboarding/1"
            className={buttonClassName({ variant: "secondary", size: "lg" })}
          >
            {t("Understand the problem", "Entenda o problema")}
          </Link>
        </m.div>
      </main>
    </>
  );
}
