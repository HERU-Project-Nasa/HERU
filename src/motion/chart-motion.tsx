"use client";

import {
  animate,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export const EASE_STANDARD = [0.2, 0, 0, 1] as const;

const STAGGER_LIST: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_STANDARD },
  },
};

const STAGGER_TAGS = {
  div: m.div,
  ul: m.ul,
  ol: m.ol,
  dl: m.dl,
  tbody: m.tbody,
} as const;

export function StaggerList({
  as = "div",
  className,
  children,
}: {
  as?: keyof typeof STAGGER_TAGS;
  className?: string;
  children: ReactNode;
}) {
  const Tag = STAGGER_TAGS[as];
  return (
    <Tag
      className={className}
      variants={STAGGER_LIST}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </Tag>
  );
}

const ITEM_TAGS = {
  div: m.div,
  li: m.li,
  article: m.article,
  tr: m.tr,
} as const;

export function StaggerItem({
  as = "div",
  className,
  children,
}: {
  as?: keyof typeof ITEM_TAGS;
  className?: string;
  children: ReactNode;
}) {
  const Tag = ITEM_TAGS[as];
  return (
    <Tag className={className} variants={STAGGER_ITEM}>
      {children}
    </Tag>
  );
}

/** Counts from the last shown value to the new one, so changing the region reads as a change. */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const text = useTransform(count, format);

  useEffect(() => {
    if (!inView && !reduced) {
      return;
    }
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 0.9,
      ease: EASE_STANDARD,
    });
    return () => controls.stop();
  }, [count, value, inView, reduced]);

  return <m.span ref={ref}>{text}</m.span>;
}

/** A clip rect that wipes an SVG chart in from left to right once it scrolls into view. */
export function useChartReveal(ref: RefObject<Element | null>) {
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const clipId = `reveal-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return {
    clipId,
    shown: inView || Boolean(reduced),
    reduced: Boolean(reduced),
  };
}

export function RevealClip({
  id,
  x,
  y,
  width,
  height,
  shown,
  reduced,
  replayKey,
  duration = 1.6,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shown: boolean;
  reduced: boolean;
  replayKey: string;
  duration?: number;
}) {
  return (
    <clipPath id={id}>
      <m.rect
        key={replayKey}
        x={x}
        y={y}
        height={height}
        initial={{ width: reduced ? width : 0 }}
        animate={{ width: shown ? width : 0 }}
        transition={{
          duration: reduced ? 0 : duration,
          ease: [0.45, 0, 0.2, 1],
        }}
      />
    </clipPath>
  );
}

/** Fades chart annotations in after the lines have been drawn. */
export function FadeInSvg({
  shown,
  delay = 0,
  children,
}: {
  shown: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <m.g
      initial={{ opacity: 0 }}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: 0.5, delay: shown ? delay : 0 }}
    >
      {children}
    </m.g>
  );
}

export type TooltipRow = { label: string; value: string; swatch: string };

/**
 * Invisible columns that track the pointer (and the keyboard, through the
 * figure) and an SVG tooltip with the values of the hovered column.
 */
export function ChartHover({
  count,
  x,
  top,
  bottom,
  left,
  right,
  viewWidth,
  title,
  rows,
  points,
}: {
  count: number;
  x: (index: number) => number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  viewWidth: number;
  title: (index: number) => string;
  rows: (index: number) => TooltipRow[];
  points: (index: number) => { y: number; className: string }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const half = count > 1 ? (x(1) - x(0)) / 2 : (right - left) / 2;
  const tooltipRows = hovered === null ? [] : rows(hovered);
  const width = 188;
  const height = 30 + tooltipRows.length * 20;
  const anchor = hovered === null ? 0 : x(hovered);
  const tooltipX =
    anchor + 14 + width > viewWidth - 4 ? anchor - 14 - width : anchor + 14;

  return (
    <g onPointerLeave={() => setHovered(null)}>
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x={x(index) - half}
          y={top}
          width={half * 2}
          height={bottom - top}
          fill="transparent"
          onPointerEnter={() => setHovered(index)}
          onPointerDown={() => setHovered(index)}
        />
      ))}
      {hovered !== null && (
        <g pointerEvents="none">
          <line
            x1={anchor}
            x2={anchor}
            y1={top}
            y2={bottom}
            className="stroke-line-strong"
            strokeDasharray="2 3"
          />
          {points(hovered).map((point, index) => (
            <circle
              key={index}
              cx={anchor}
              cy={point.y}
              r={4.5}
              strokeWidth={2}
              className={`fill-surface ${point.className}`}
            />
          ))}
          <m.g
            key={hovered}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          >
            <rect
              x={tooltipX}
              y={top}
              width={width}
              height={height}
              rx={6}
              className="fill-surface-raised stroke-line-strong"
            />
            <text
              x={tooltipX + 12}
              y={top + 20}
              fontSize="12"
              fontWeight="600"
              className="fill-ink"
            >
              {title(hovered)}
            </text>
            {tooltipRows.map((row, index) => (
              <g key={row.label}>
                <rect
                  x={tooltipX + 12}
                  y={top + 33 + index * 20}
                  width={10}
                  height={3}
                  rx={1.5}
                  className={row.swatch}
                />
                <text
                  x={tooltipX + 28}
                  y={top + 38 + index * 20}
                  fontSize="12"
                  className="fill-ink-muted"
                >
                  {row.label}
                </text>
                <text
                  x={tooltipX + width - 12}
                  y={top + 38 + index * 20}
                  fontSize="12"
                  fontWeight="600"
                  textAnchor="end"
                  className="fill-ink tabular-nums"
                >
                  {row.value}
                </text>
              </g>
            ))}
          </m.g>
        </g>
      )}
    </g>
  );
}
