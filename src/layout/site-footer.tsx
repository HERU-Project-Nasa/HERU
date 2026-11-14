export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-black">
      <p className="type-body-sm px-6 py-6 text-center text-ink-muted lg:px-16">
        Focos de calor:{" "}
        <a
          href="https://earthdata.nasa.gov/firms"
          className="text-link underline underline-offset-2"
        >
          NASA FIRMS
        </a>
        , parte do LANCE e do ESDIS. Imagens da Terra: NASA Earth Observatory
        (Blue Marble e Black Marble).
      </p>
    </footer>
  );
}
