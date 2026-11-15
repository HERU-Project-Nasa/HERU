import type { Metadata } from "next";
import { Suspense } from "react";
import { BeforeAfterChart } from "@/methodology/before-after-chart";
import {
  MethodologyDates,
  MethodologyFigures,
  MethodologyFiles,
} from "@/methodology/methodology-figures";
import { MethodologySection } from "@/methodology/methodology-sections";
import { SectionContents } from "@/methodology/section-contents";
import { SensorTimeline } from "@/methodology/sensor-timeline";

export const metadata: Metadata = {
  title: "Metodologia | HERU",
  description:
    "De onde vêm os números do HERU, como foram ajustados e até onde dá para confiar neles.",
};

const SENSORS = [
  {
    instrument: "MODIS",
    satellite: "Terra",
    since: "nov 2000",
    pixel: "~1 km",
    use: "2003 a 2011, multiplicado por k",
  },
  {
    instrument: "MODIS",
    satellite: "Aqua",
    since: "jul 2002",
    pixel: "~1 km",
    use: "2003 a 2011, multiplicado por k",
  },
  {
    instrument: "VIIRS",
    satellite: "Suomi NPP",
    since: "20/01/2012",
    pixel: "375 m",
    use: "20/01/2012 a 02/11/2026, como observado",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-20",
    since: "01/04/2018",
    pixel: "375 m",
    use: "A partir de 03/11/2026, multiplicado por k20",
  },
  {
    instrument: "VIIRS",
    satellite: "NOAA-21",
    since: "17/01/2024",
    pixel: "375 m",
    use: "Fica fora da série harmonizada",
  },
  {
    instrument: "OLI",
    satellite: "Landsat 8 e 9",
    since: "-",
    pixel: "30 m",
    use: "Só EUA e Canadá; fica fora do calendário",
  },
];

const SERIES_STEPS = [
  {
    period: "2003 a 2011",
    text: "Só existe MODIS. Cada foco MODIS vira k focos equivalentes VIIRS, com o k do bloco de 5° onde caiu.",
  },
  {
    period: "20 de janeiro de 2012 a 2 de novembro de 2026",
    text: "Usamos o VIIRS do Suomi NPP como ele foi observado. Nada é ajustado.",
  },
  {
    period: "3 de novembro de 2026 em diante",
    text: "O S-NPP parou de observar. Entra o NOAA-20, multiplicado por k20 = focos S-NPP ÷ focos NOAA-20, em anos inteiros de 2019 a 2025.",
  },
];

const HARMONIZATION_REASONS = [
  {
    title: "Por que a régua é o VIIRS",
    text: "O MODIS está no fim da vida útil. Com o VIIRS como referência, todo dado novo entra sem conversão, e só o passado é ajustado.",
  },
  {
    title: "Por que um k por bloco de 5°",
    text: "A razão entre os sensores muda de uma região para outra. Um fator único para o mundo erraria em quase toda parte, então cada foco MODIS usa o k do seu bloco.",
  },
  {
    title: "Por que somar foco a foco",
    text: "O total de um país soma cada foco já convertido. Um bloco ou uma célula na fronteira pode ter focos de dois países, por isso o total não é a soma das células.",
  },
  {
    title: "Por que calibrar em 2012-2019",
    text: "A partir de 2020, a deriva das órbitas do MODIS muda a contagem. Como a série só usa o MODIS até 2011, a deriva não entra no resultado.",
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
          <Suspense>
            <MethodologyFiles />
          </Suspense>
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
            <MethodologyDates />
          </header>

          <Suspense>
            <MethodologyFigures />
          </Suspense>

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
              System): os produtos científicos para o histórico e os de quase
              tempo real para os dias recentes.
            </p>
            <p className={PARAGRAPH}>
              Os dados de quase tempo real chegam em cerca de 3 horas e são
              trocados pelos científicos de 2 a 4 meses depois. Enquanto isso,
              os meses que ainda têm algum dia de quase tempo real aparecem no
              calendário como{" "}
              <strong className="font-semibold">preliminares</strong>, e os
              números podem mudar.
            </p>
            <p className={PARAGRAPH}>
              Os dias seguem o horário UTC. Um dia só fecha depois da última
              passagem, perto da meia-noite UTC, mais o atraso do quase tempo
              real. Até lá ele aparece como{" "}
              <strong className="font-semibold">parcial</strong> e fica fora das
              comparações.
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
                MODIS: só focos do tipo vegetação (type = 0). Vulcões, fontes
                fixas e detecções no mar ficam de fora.
              </li>
              <li>
                VIIRS: saem os focos que caem sobre fontes fixas de calor já
                conhecidas, como queima de gás e indústrias.
              </li>
              <li>
                Todos os níveis de confiança entram, porque o VIIRS nunca marca
                confiança baixa à noite.
              </li>
              <li>
                Contamos foco a foco por país e para o mundo, por dia, mês e
                ano, separando dia e noite. Para o mapa, também por célula de
                0,25° e mês.
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
              VIIRS S-NPP.
            </p>
            <div className="flex flex-col gap-2.5 rounded-md bg-surface-hover px-6 py-5">
              <p className="font-ui text-lg leading-6 font-semibold text-ink tabular-nums">
                k = focos S-NPP ÷ focos MODIS, de 2012 a 2019
              </p>
              <p className="type-body-sm text-ink-muted">
                Calculado em cada bloco de 5° de latitude e longitude.
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
            <Suspense>
              <BeforeAfterChart />
            </Suspense>
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
            <ul className={BULLET_LIST}>
              <li>
                <strong className="font-semibold">Erro mediano mensal:</strong>{" "}
                metade dos meses erra menos que esse valor.
              </li>
              <li>
                <strong className="font-semibold">Correlação r:</strong> quanto
                a reconstrução acompanha o VIIRS observado, em escala log; 1 é o
                acompanhamento perfeito.
              </li>
            </ul>
            <p className={PARAGRAPH}>
              Os dois números da região escolhida estão no painel do topo. O
              gráfico mês a mês da reconstrução entra quando essa série for
              publicada.
            </p>
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
                Áreas menores que um país, como estados e biomas. Por enquanto,
                só países e o mundo.
              </li>
            </ul>
          </MethodologySection>

          <MethodologySection id="creditos">
            <ul className={BULLET_LIST}>
              <li>
                Dados: NASA FIRMS (MODIS C6.1 e VIIRS 375 m), com dados de quase
                tempo real do LANCE.
              </li>
              <li>
                Fronteiras: Natural Earth 1:50m, domínio público. A área dos
                países é aproximada, calculada dessas fronteiras.
              </li>
              <li>Mapa: MapLibre GL, sem mapas de terceiros.</li>
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
