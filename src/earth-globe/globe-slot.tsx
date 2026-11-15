"use client";

import { useEffect, useRef } from "react";
import { placeGlobe, releaseGlobe } from "./globe-store";

export function GlobeSlot({
  className,
  visible,
}: {
  className: string;
  visible: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current!;
    placeGlobe({ element, visible });
    return () => releaseGlobe(element);
  }, [visible]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none invisible absolute aspect-square ${className}`}
    />
  );
}
