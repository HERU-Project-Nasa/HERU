import Link from "next/link";
import { MaterialSymbol } from "@/icons/material-symbols";

export function StepIndicator({
  stepNumber,
  stepCount,
}: {
  stepNumber: number;
  stepCount: number;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-6 pb-6 lg:px-16 lg:pb-10">
      <div className="flex items-center gap-3 sm:gap-4">
        <p className="type-caption whitespace-nowrap text-ink-muted tabular-nums">
          {stepNumber} de {stepCount}
        </p>
        <div aria-hidden="true" className="flex gap-1 sm:gap-1.5">
          {Array.from({ length: stepCount }, (_, index) => (
            <span
              key={index}
              className={`h-0.5 w-3 rounded-xs sm:w-6 ${index < stepNumber ? "bg-ink" : "bg-line"}`}
            />
          ))}
        </div>
      </div>
      <Link
        href="/calendar"
        className="type-button inline-flex h-10 items-center gap-1.5 whitespace-nowrap text-ink-muted transition-colors duration-120 ease-standard hover:text-ink"
      >
        Pular introdução
        <MaterialSymbol name="arrow_forward" className="size-[18px]" />
      </Link>
    </div>
  );
}
