"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

export default function CalendarTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </m.div>
  );
}
