import type { KeyboardEvent } from "react";

export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const moveWithArrows = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    const buttons =
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    buttons[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={moveWithArrows}
      className="inline-flex h-8 items-center gap-0.5 rounded-sm border border-line-strong bg-surface p-px"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`type-chip h-7 cursor-pointer rounded-[3px] px-3 whitespace-nowrap transition-colors duration-120 ease-standard ${checked ? "bg-selected font-semibold text-ink-inverse hover:bg-selected-hover" : "text-ink hover:bg-surface-hover"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
