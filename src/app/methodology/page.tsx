import type { Metadata } from "next";
import { MaterialSymbol } from "@/icons/material-symbols";
import { ConfidenceBadge } from "@/methodology/confidence-badge";
import { HarmonizationChart } from "@/methodology/harmonization-chart";
import { MethodologySection } from "@/methodology/methodology-sections";
import { SectionContents } from "@/methodology/section-contents";
import { SensorTimeline } from "@/methodology/sensor-timeline";
import { ValidationChart } from "@/methodology/validation-chart";

export const metadata: Metadata = {
  title: "Metodologia | HERU",
  description:
    "De onde vêm os números do HERU, como foram ajustados e até onde dá para confiar neles.",
};

const PASSES = [
  { label: "Todas", available: true },
  { label: "Dia", available: false },
  { label: "Noite", available: false },
];

const CONFIDENCE_FIGURES = [
  { value: "3,7", description: "focos VIIRS por foco MODIS aqui (k)" },
  { value: "2012-2019", description: "anos de calibração, sensores estáveis" },
  { value: "9%", description: "erro mediano mensal, testado em 2020-2024" },
];

const SENSORS = [
  {
    instrument: "MODIS",
    satellite: "Terra",
    since: "nov 2000",
    pixel: "~1 km",
    use: "2003-2011, multiplicado por k",
  },
  {
    instrument: "MODIS",
    satellite: "Aqua",
    since: "jul 2002",
    pixel: "~1 km",
    use: "2003-2011, multiplicado por k",
  },
  {
    instrument: "VIIRS",
    satellite: "Suomi NPP",
    since: "20/01/2012",
    pixel: "375 m",
    use: "jan 2012 a out 2026, como observado",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-20",
    since: "01/04/2018",
    pixel: "375 m",
    use: "nov 2026 em diante, multiplicado por k₂",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-21",
    since: "17/01/2024",
    pixel: "375 m",
    use: "Fora do MVP",
  },
];

const SERIES_STEPS = [
  {
    period: "2003 a 2011",
    text: "Só existe MODIS. Cada foco MODIS vira k focos equivalentes VIIRS.",
  },
  {
    period: "Janeiro de 2012 a outubro de 2026",
    text: "Usamos o VIIRS do Suomi NPP como ele foi observado. Nada é ajustado.",
  },
  {
    period: "Novembro de 2026 em diante",
    text: "O S-NPP para de produzir focos. Entra o NOAA-20, multiplicado por k₂ = S-NPP ÷ NOAA-20, de 2019 a 2025.",
  },
];

const HARMONIZATION_REASONS = [
  {
    title: "Por que a régua é o VIIRS",
    text: "O MODIS está no fim da vida útil. Com o VIIRS como referência, todo dado novo entra sem conversão, e só o passado é ajustado.",
  },
  {
    title: "Por que um k por área",
    text: "Na nossa pesquisa, a razão foi 3,81 na Bolívia e 2,76 em Portugal. Um fator único para o mundo erraria em quase toda parte.",
  },
  {
    title: "Por que um k por passagem",
    text: "À noite, o VIIRS encontra muito mais focos que o MODIS do que de dia. Um k único distorceria o filtro de dia e noite.",
  },
  {
    title: "Por que calibrar em 2012-2019",
    text: "A partir de 2020, a deriva das órbitas do MODIS muda a contagem. Como a série só usa o MODIS até 2011, a deriva não entra no resultado.",
  },
];

const CONFIDENCE_RULES = [
  {
    level: "high" as const,
    text: "Muitos focos MODIS nos anos de calibração.",
  },
  {
    level: "medium" as const,
    text: "Volume intermediário: leia as diferenças pequenas com cautela.",
  },
  {
    level: "low" as const,
    text: "Poucos focos para calibrar a área sozinha. Usamos o fator da Bolívia.",
  },
];

const PARAGRAPH = "type-body max-w-[680px] text-ink";
const BULLET_LIST =
  "type-body flex max-w-[680px] list-disc flex-col gap-2.5 pl-5 text-ink";
const PANEL = "rounded-md border border-line bg-surface";

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-[1328px] px-6 pt-8 pb-24 lg:px-16 lg:pt-12">
      <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-16">
        <aside className="order-last flex flex-col gap-6 lg:sticky lg:top-8 lg:order-none">
          <SectionContents />
          <div className="flex flex-col items-start gap-2 border-t border-line pt-6">
            <span className="type-caption text-ink-muted">Arquivos</span>
            {["validation.json", "Série mensal (CSV)"].map((file) => (
              <button
                key={file}
                type="button"
                disabled
                className="type-button inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-sm border border-dashed border-line px-3 text-ink-disabled"
              >
                <MaterialSymbol name="download" className="size-[18px]" />
                {file}
              </button>
            ))}
            <p className="type-body-sm text-ink-muted">
              Disponíveis quando o pipeline gerar os dados.
            </p>
          </div>
        </aside>
        <div className="flex max-w-[880px] min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-3">
            <p className="type-eyebrow text-ink-muted">Metodologia</p>
            <h1 className="type-heading-lg lg:type-heading-xl text-ink">
              Como o HERU põe 24 anos de dois satélites na mesma escala
            </h1>
            <p className="type-body-lg max-w-[680px] text-ink-muted">
              De onde vêm os números, como foram ajustados e até onde dá para
              confiar neles. Leva cerca de dois minutos.
            </p>
            <p className="type-caption text-ink-muted tabular-nums">
              Atualizado em 14/11/2026 · dados até 13/11/2026
            </p>
          </header>

          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
            <div className="flex flex-col items-start gap-1.5">
              <span className="type-caption text-ink-muted">Região</span>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-surface-raised px-2.5 font-ui text-[13px] tracking-[0.06em] text-ink">
                <MaterialSymbol name="location_on" className="size-4" />
                Bolívia
              </span>
            </div>
            <p className="type-body-sm text-ink-muted">
              Os números abaixo mudam com a região e a passagem.
            </p>
          </div>

          <section
            aria-labelledby="confidence-title"
            className={`${PANEL} flex flex-col gap-5 p-6`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="confidence-title" className="type-heading-sm text-ink">
                Quanto dá para confiar?
              </h2>
              <ConfidenceBadge level="high" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span id="passes-label" className="type-caption text-ink-muted">
                Passagens
              </span>
              <div
                role="radiogroup"
                aria-labelledby="passes-label"
                className="inline-flex h-8 items-center gap-0.5 rounded-sm border border-line-strong bg-surface p-px"
              >
                {PASSES.map((pass) => (
                  <button
                    key={pass.label}
                    type="button"
                    role="radio"
                    aria-checked={pass.label === "Todas"}
                    disabled={!pass.available}
                    className={`h-7 rounded-[3px] px-3 font-ui text-sm tracking-[0.06em] whitespace-nowrap ${pass.available ? "bg-selected font-semibold text-ink-inverse" : "cursor-not-allowed text-ink-disabled"}`}
                  >
                    {pass.label}
                  </button>
                ))}
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {CONFIDENCE_FIGURES.map((figure) => (
                <div
                  key={figure.value}
                  className="flex min-w-0 flex-col-reverse justify-end gap-0.5"
                >
                  <dt className="type-body-sm text-ink-muted">
                    {figure.description}
                  </dt>
                  <dd className="font-text text-2xl leading-8 font-semibold whitespace-nowrap text-ink tabular-nums">
                    {figure.value}
                  </dd>
                </div>
              ))}
            </dl>
            <a
              href="#harmonizacao"
              className="type-button inline-flex items-center gap-1.5 self-start text-ink"
            >
              Como harmonizamos
              <MaterialSymbol name="arrow_forward" className="size-[18px]" />
            </a>
          </section>

          <MethodologySection id="foco">
            <p className={PARAGRAPH}>
              Um foco é um pixel em que o satélite detectou uma anomalia térmica
              durante uma passagem. Não é um incêndio inteiro: um fogo grande
              pode gerar dezenas de focos, e um pequeno, ou coberto por nuvens,
              pode não aparecer.
            </p>
            <p className={PARAGRAPH}>
              Queimadas agrícolas, descarte de resíduos e atividades industriais
              também geram focos. Por isso falamos sempre em{" "}
              <strong className="font-semibold">focos detectados</strong>, nunca
              em incêndios.
            </p>
            <figure
              className={`${PANEL} flex flex-wrap items-end gap-x-10 gap-y-4 p-6`}
            >
              <div className="flex flex-col gap-2">
                <span
                  aria-hidden="true"
                  className="block size-40 rounded-xs border-[1.5px] border-modis bg-globe-land"
                />
                <span className="type-data text-ink">
                  MODIS · cerca de 1 km
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span
                  aria-hidden="true"
                  className="block size-[60px] rounded-xs border-[1.5px] border-viirs bg-globe-land"
                />
                <span className="type-data text-ink">VIIRS · 375 m</span>
              </div>
              <figcaption className="type-body-sm min-w-[200px] flex-1 text-ink-muted">
                Quadrados em escala. Cabem cerca de sete pixels VIIRS em um
                pixel MODIS. A coordenada de cada foco é o centro do pixel.
              </figcaption>
            </figure>
          </MethodologySection>

          <MethodologySection id="fontes">
            <p className={PARAGRAPH}>
              Tudo vem do NASA FIRMS (Fire Information for Resource Management
              System): o arquivo anual por país, o Archive Download e a Area API
              para os dias mais recentes.
            </p>
            <p className={PARAGRAPH}>
              Os dados de quase tempo real chegam em até 3 horas e são trocados
              pelos científicos cerca de cinco meses depois. Por isso, os meses
              a partir de julho de 2025 aparecem como{" "}
              <strong className="font-semibold">preliminares</strong>.
            </p>
            <SensorTimeline />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr>
                    {[
                      "Sensor",
                      "Satélite",
                      "Desde",
                      "Pixel",
                      "Uso no HERU",
                    ].map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="type-caption pr-4 pb-3 font-normal text-ink-muted"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="type-body-sm">
                  {SENSORS.map((sensor) => (
                    <tr key={sensor.satellite} className="border-t border-line">
                      <td className="type-data py-3 pr-4 text-ink">
                        {sensor.instrument}
                      </td>
                      <td className="py-3 pr-4 text-ink">{sensor.satellite}</td>
                      <td className="py-3 pr-4 text-ink tabular-nums">
                        {sensor.since}
                      </td>
                      <td className="py-3 pr-4 text-ink">{sensor.pixel}</td>
                      <td className="py-3 pr-4 text-ink-muted">{sensor.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MethodologySection>

          <MethodologySection id="filtragem">
            <ul className={BULLET_LIST}>
              <li>
                Só focos do tipo vegetação (type = 0). Vulcões, fontes fixas,
                como a queima de gás, e detecções no mar ficam de fora.
              </li>
              <li>
                Todos os níveis de confiança, porque o VIIRS nunca marca
                confiança baixa à noite.
              </li>
              <li>
                Contamos os focos por célula de 0,25°, mês, sensor e passagem
                (dia ou noite).
              </li>
              <li>
                A série começa em 2003. O Aqua só entrou em julho de 2002, e
                antes disso a contagem cai pela metade sem que o fogo mude.
              </li>
            </ul>
          </MethodologySection>

          <MethodologySection id="harmonizacao">
            <p className={PARAGRAPH}>
              Os dois sensores enxergam o mesmo fogo de jeitos diferentes. Para
              comparar 2005 com 2025, convertemos o passado para a régua do
              VIIRS.
            </p>
            <div className="flex flex-col gap-2.5 rounded-md bg-surface-hover px-6 py-5">
              <p className="font-ui text-lg leading-6 font-semibold text-ink tabular-nums">
                k = focos S-NPP ÷ focos MODIS, de 2012 a 2019
              </p>
              <p className="type-body-sm text-ink-muted">
                Calculado na área escolhida e para cada passagem: todas, dia e
                noite.
              </p>
            </div>
            <ol className="flex flex-col gap-4">
              {SERIES_STEPS.map((step, index) => (
                <li
                  key={step.period}
                  className="grid grid-cols-[32px_1fr] items-start gap-3"
                >
                  <span className="type-data inline-flex size-7 items-center justify-center rounded-full bg-surface-raised text-ink">
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-0.5 pt-0.5">
                    <span className="font-text text-base leading-6 font-semibold text-ink">
                      {step.period}
                    </span>
                    <span className="type-body text-ink-muted">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <HarmonizationChart />
            <div className="grid gap-4 sm:grid-cols-2">
              {HARMONIZATION_REASONS.map((reason) => (
                <article
                  key={reason.title}
                  className={`${PANEL} flex flex-col gap-1.5 p-5`}
                >
                  <h3 className="type-heading-sm text-ink">{reason.title}</h3>
                  <p className="type-body text-ink-muted">{reason.text}</p>
                </article>
              ))}
            </div>
          </MethodologySection>

          <MethodologySection id="validacao">
            <p className={PARAGRAPH}>
              Para testar o método, reconstruímos o VIIRS de 2020 a 2024 a
              partir do MODIS × k e comparamos com o que o VIIRS de fato viu.
              Esses anos não entram na calibração.
            </p>
            <ValidationChart />
            <p className={PARAGRAPH}>
              O selo de confiança depende do volume de focos MODIS nos anos de
              calibração:
            </p>
            <ul className="flex flex-col gap-3">
              {CONFIDENCE_RULES.map((rule) => (
                <li
                  key={rule.level}
                  className="flex flex-wrap items-center gap-3"
                >
                  <ConfidenceBadge level={rule.level} />
                  <span className="type-body text-ink-muted">{rule.text}</span>
                </li>
              ))}
            </ul>
          </MethodologySection>

          <MethodologySection id="limites">
            <ul className={BULLET_LIST}>
              <li>
                Área queimada, emissões, fumaça ou intensidade do fogo (FRP).
              </li>
              <li>Previsão de fogo ou risco meteorológico.</li>
              <li>
                Incêndios registrados em bases oficiais. Mostramos só focos
                detectados por satélite.
              </li>
              <li>
                O mundo inteiro. O globo mostra a Terra, mas os dados cobrem
                Bolívia, Pantanal e Portugal.
              </li>
            </ul>
          </MethodologySection>

          <MethodologySection id="creditos">
            <ul className={BULLET_LIST}>
              <li>
                Dados: NASA FIRMS (MODIS C6.1 e VIIRS 375 m), com dados de quase
                tempo real do LANCE.
              </li>
              <li>Fronteiras: Natural Earth, domínio público.</li>
              <li>
                Globo: Three.js, com as imagens Blue Marble e Black Marble do
                NASA Earth Observatory.
              </li>
              <li>Equipe HERU, NASA Space Apps 2026.</li>
            </ul>
          </MethodologySection>
        </div>
      </div>
    </main>
  );
}
