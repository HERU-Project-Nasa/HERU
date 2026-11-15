import type { CSSProperties } from "react";

const LAYER_COUNT = 6;
const STARS_PER_LAYER = 56;
const BRIGHT_STARS_PER_LAYER = 3;
const SKY_SEED = 2026;
const STAR_TINTS = ["242, 242, 242", "214, 228, 255", "255, 238, 214"];

const STAR_LAYER_STYLES = starLayerStyles(seededRandom(SKY_SEED));

export function StarField({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
    >
      {STAR_LAYER_STYLES.map((style, layer) => (
        <span
          key={layer}
          style={style}
          className="absolute top-0 left-0 size-px rounded-full motion-safe:animate-star-twinkle"
        />
      ))}
    </div>
  );
}

function starLayerStyles(random: () => number): CSSProperties[] {
  return Array.from({ length: LAYER_COUNT }, (_, layer) => {
    const shadows = Array.from({ length: STARS_PER_LAYER }, (_, star) => {
      const x = `${(random() * 100).toFixed(2)}vw`;
      const y = `${(random() * 100).toFixed(2)}vh`;
      const tint = STAR_TINTS[Math.floor(random() * STAR_TINTS.length)];
      if (star < BRIGHT_STARS_PER_LAYER) {
        return [
          `${x} ${y} 0 1px rgba(${tint}, 0.95)`,
          `${x} ${y} 6px 2px rgba(${tint}, 0.35)`,
        ].join(", ");
      }
      const alpha = (0.18 + random() * 0.5).toFixed(2);
      const spread = random() < 0.3 ? 0.5 : 0;
      return `${x} ${y} 0 ${spread}px rgba(${tint}, ${alpha})`;
    });
    return {
      boxShadow: shadows.join(", "),
      animationDuration: `${(3.2 + layer * 1.1).toFixed(1)}s`,
      animationDelay: `${(-layer * 0.7).toFixed(1)}s`,
    };
  });
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
