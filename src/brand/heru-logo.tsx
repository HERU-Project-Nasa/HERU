import { MaterialSymbol } from "@/icons/material-symbols";

const LOGO_CLASS_NAMES = {
  header: {
    logo: "gap-2.5",
    icon: "size-6 lg:size-7",
    wordmark: "text-base leading-5",
  },
  loading: {
    logo: "gap-5",
    icon: "size-14 motion-safe:animate-satellite-swing",
    wordmark: "text-[32px] leading-10",
  },
};

export function HeruLogo({
  variant,
}: {
  variant: keyof typeof LOGO_CLASS_NAMES;
}) {
  const classNames = LOGO_CLASS_NAMES[variant];
  return (
    <span className={`inline-flex items-center text-ink ${classNames.logo}`}>
      <MaterialSymbol name="satellite_alt" className={classNames.icon} />
      <span
        className={`font-ui font-bold tracking-[0.12em] ${classNames.wordmark}`}
      >
        HERU
      </span>
    </span>
  );
}
