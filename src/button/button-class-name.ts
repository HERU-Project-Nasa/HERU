const VARIANT_CLASS_NAMES = {
  primary:
    "border-selected bg-selected text-ink-inverse hover:border-selected-hover hover:bg-selected-hover",
  secondary: "border-line-strong bg-surface-raised text-ink hover:border-ink",
  ghost: "border-transparent bg-transparent text-ink hover:bg-surface-hover",
};

const SIZE_CLASS_NAMES = {
  lg: "h-12 px-6",
  icon: "size-11",
};

export function buttonClassName({
  variant,
  size,
}: {
  variant: keyof typeof VARIANT_CLASS_NAMES;
  size: keyof typeof SIZE_CLASS_NAMES;
}): string {
  return `type-button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border whitespace-nowrap transition-colors duration-120 ease-standard ${VARIANT_CLASS_NAMES[variant]} ${SIZE_CLASS_NAMES[size]}`;
}
