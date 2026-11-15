"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

const EASE_STANDARD = [0.2, 0, 0, 1] as const;
const DISTANCE = 20;
const DURATION = 0.7;

export function FadeUp({
  children,
  className,
  delay = 0,
  onScroll = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  onScroll?: boolean;
}) {
  const shown = { opacity: 1, y: 0 };
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: DISTANCE }}
      {...(onScroll
        ? { whileInView: shown, viewport: { once: true, amount: 0.12 } }
        : { animate: shown })}
      transition={{ duration: DURATION, delay, ease: EASE_STANDARD }}
    >
      {children}
    </m.div>
  );
}
