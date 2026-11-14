export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-neutral-600 dark:text-neutral-400">
        Active fire data from{" "}
        <a
          href="https://earthdata.nasa.gov/firms"
          className="underline underline-offset-2"
        >
          NASA FIRMS
        </a>
        , part of LANCE and ESDIS.
      </p>
    </footer>
  );
}
