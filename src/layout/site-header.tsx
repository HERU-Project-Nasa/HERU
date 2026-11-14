import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link
          href="/"
          className="flex min-h-11 items-center text-base font-semibold tracking-tight"
        >
          Fire Calendar
        </Link>
      </div>
    </header>
  );
}
