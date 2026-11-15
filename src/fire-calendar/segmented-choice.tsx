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
      className="flex h-10 w-full items-center gap-0.5 rounded-md border border-line-strong bg-surface-ground/60 p-1 sm:inline-flex sm:w-auto"
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
            className={`type-chip h-8 flex-1 cursor-pointer rounded-[5px] px-2.5 whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 ease-standard sm:flex-none sm:px-3 ${checked ? "bg-selected font-semibold text-ink-inverse shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:bg-selected-hover" : "text-ink-muted hover:bg-surface-hover hover:text-ink"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
