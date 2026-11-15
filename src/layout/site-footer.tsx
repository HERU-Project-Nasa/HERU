import Image from "next/image";
import { HERU_TEAM } from "@/team/heru-team";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-black">
      <div className="flex flex-col items-center gap-5 px-6 py-8 lg:px-16">
        <div className="flex flex-col items-center gap-3">
          <p className="type-caption text-ink-muted">
            Equipe HERU · NASA Space Apps Challenge 2026
          </p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {HERU_TEAM.map((member) => (
              <li key={member.name}>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} no LinkedIn, abre em nova aba`}
                  className="type-body-sm flex items-center gap-2 text-ink underline-offset-2 hover:underline"
                >
                  <Image
                    src={member.photo}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-full border border-line object-cover"
                  />
                  {member.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="type-body-sm text-center text-ink-muted">
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
      </div>
    </footer>
  );
}
