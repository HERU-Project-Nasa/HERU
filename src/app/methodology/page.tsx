import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { BeforeAfterChart } from "@/methodology/before-after-chart";
import { DataFlowFigure } from "@/methodology/data-flow-figure";
import {
  ConfidenceLegend,
  ConfidenceScale,
  MethodologyDates,
  MethodologyFigures,
  MethodologyFiles,
} from "@/methodology/methodology-figures";
import { StaggerItem, StaggerList } from "@/motion/chart-motion";
import { MethodologySection } from "@/methodology/methodology-sections";
import { PixelScaleFigure } from "@/methodology/pixel-scale-figure";
import { SectionContents } from "@/methodology/section-contents";
import { SensorTimeline } from "@/methodology/sensor-timeline";
import { ValidationChart } from "@/methodology/validation-chart";
import { FadeUp } from "@/motion/fade-up";
import { HERU_TEAM } from "@/team/heru-team";

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
    since: "01/03/2023",
    pixel: "375 m",
    use: "Fica fora da série harmonizada",
  },
  {
    instrument: "OLI",
    satellite: "Landsat 8 e 9",
    since: "20/06/2022",
    pixel: "30 m",
    use: "Só EUA e Canadá; fica fora do calendário",
  },
];

const SERIES_STEPS = [
  {
    period: "2003 a 2011",
    sensor: "MODIS × k",
    className: "bg-modis text-surface-ground",
    text: "Só existe MODIS. Cada foco MODIS vira k focos equivalentes VIIRS, com o k do bloco de 5° onde caiu.",
  },
  {
    period: "20 de janeiro de 2012 a 2 de novembro de 2026",
    sensor: "VIIRS S-NPP",
    className: "bg-viirs text-ink",
    text: "Usamos o VIIRS do Suomi NPP como ele foi observado. Nada é ajustado.",
  },
  {
    period: "3 de novembro de 2026 em diante",
    sensor: "NOAA-20 × k20",
    className: "bg-viirs-adjusted text-surface-ground",
    text: "O S-NPP parou de observar. Entra o NOAA-20, multiplicado por k20 = focos S-NPP ÷ focos NOAA-20, em anos inteiros de 2019 a 2025, também por bloco de 5°.",
  },
];

const HARMONIZATION_REASONS = [
  {
    title: "Por que a régua é o VIIRS",
    symbol: "straighten" as SymbolName,
    text: "O MODIS está no fim da vida útil. Com o VIIRS como referência, todo dado novo entra sem conversão, e só o passado é ajustado.",
  },
  {
    title: "Por que um k por bloco de 5°",
    symbol: "map" as SymbolName,
    text: "A razão entre os sensores muda de uma região para outra. Um fator único para o mundo erraria em quase toda parte, então cada foco MODIS usa o k do seu bloco. Um bloco com menos de 1.000 focos nos anos de calibração usa o k do mundo.",
  },
  {
    title: "Por que um k por passagem",
    symbol: "sunny" as SymbolName,
    text: "À noite, o VIIRS encontra muito mais focos que o MODIS do que de dia. Um k único distorceria o filtro de dia e noite. Por isso, a soma de dia e noite não dá exatamente o total.",
  },
  {
    title: "Por que somar foco a foco",
    symbol: "bar_chart" as SymbolName,
    text: "O total de um país soma cada foco já convertido. Um bloco ou uma célula na fronteira pode ter focos de dois países, por isso o total não é a soma das células.",
  },
  {
    title: "Por que calibrar em 2012-2019",
    symbol: "date_range" as SymbolName,
    text: "A partir de 2020, a deriva das órbitas do MODIS muda a contagem. Como a série só usa o MODIS até 2011, a deriva não entra no resultado. O k20 usa anos inteiros de 2019 a 2025, todos do produto científico, para cobrir todas as estações do ano por igual.",
  },
];

const FILTERS: { symbol: SymbolName; title: string; text: string }[] = [
  {
    symbol: "eco",
    title: "Só vegetação",
    text: "No produto científico, que informa o tipo de cada foco, só entram os de vegetação (type 0). Vulcões, outras fontes fixas em terra e detecções no mar ficam de fora.",
  },
  {
    symbol: "flag",
    title: "Sem fontes fixas conhecidas",
    text: "No quase tempo real, que não informa o tipo, saem os focos que caem sobre fontes fixas de calor já conhecidas, como refinarias, campos de gás e indústrias, marcadas numa grade de 0,01°.",
  },
  {
    symbol: "verified",
    title: "Toda confiança entra",
    text: "Todos os níveis de confiança entram, porque o VIIRS nunca marca confiança baixa à noite.",
  },
  {
    symbol: "bar_chart",
    title: "Contagem foco a foco",
    text: "Contamos foco a foco por país e para o mundo, por dia, mês e ano, separando dia e noite. Para o mapa, também por célula de 0,25° e mês. Focos no mar entram no total do mundo, mas em nenhum país.",
  },
  {
    symbol: "map",
    title: "Quadrados de 0,25° no mapa",
    text: "No mapa de períodos longos, cada quadrado de 0,25° (cerca de 28 km) soma os focos que caíram nele. Mostramos todo quadrado que toca o país, mesmo que o centro dele caia no mar ou no vizinho, para que nenhum foco do país fique de fora; numa ilha pequena, como Santa Lúcia, nenhum centro cai em terra. Na fronteira, o quadrado pode trazer focos do vizinho, mas o total do período não muda, porque é contado foco a foco.",
  },
  {
    symbol: "calendar_month",
    title: "Começo em 2002",
    text: "A série harmonizada começa em julho de 2002, quando o Aqua começou a observar. Antes, só o Terra observava e a contagem cai pela metade sem que as fontes de calor mudem. O calendário começa em 2003, o primeiro ano inteiro com os dois.",
  },
];

const METRICS = [
  {
    title: "Erro mediano mensal",
    text: "Metade dos meses erra menos que esse valor.",
  },
  {
    title: "Correlação r",
    text: "Quanto a reconstrução acompanha o S-NPP observado, em escala log; 1 é o acompanhamento perfeito.",
  },
  {
    title: "Meses usados",
    text: "Quantos meses entraram na comparação. Com poucos meses, o erro diz pouco.",
  },
  {
    title: "Concordância de país",
    text: "A fração dos focos do país em que a fronteira usada pela pipeline dá o mesmo país do arquivo do FIRMS. A meta é 99% ou mais.",
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
          <FadeUp>
            <header className="flex flex-col gap-3">
              <p className="type-eyebrow text-ink-muted">Metodologia</p>
              <h1 className="type-heading-lg lg:type-heading-xl text-ink">
                Como o HERU põe 24 anos de dois sensores na mesma escala
              </h1>
              <p className="type-body-lg max-w-[680px] text-ink-muted">
                De onde vêm os números, como foram ajustados e até onde dá para
                confiar neles. Leva cerca de dois minutos.
              </p>
              <MethodologyDates />
            </header>
          </FadeUp>

          <FadeUp delay={0.15}>
            <Suspense>
              <MethodologyFigures />
            </Suspense>
          </FadeUp>

          <MethodologySection id="foco">
            <p className={PARAGRAPH}>
              Um foco é um pixel em que o satélite detectou uma anomalia térmica
              durante uma passagem. Ele não mostra o tamanho da fonte de calor:
              uma fonte grande pode gerar dezenas de focos, e uma pequena, ou
              coberta por nuvens, pode não aparecer.
            </p>
            <p className={PARAGRAPH}>
              Manejo agrícola, descarte de resíduos e atividades industriais
              também geram focos. Por isso falamos sempre em{" "}
              <strong className="font-semibold">fontes de calor</strong>{" "}
              detectadas.
            </p>
            <PixelScaleFigure />
          </MethodologySection>

          <MethodologySection id="fontes">
            <p className={PARAGRAPH}>
              Tudo vem do NASA FIRMS (Fire Information for Resource Management
              System): os produtos científicos para o histórico e os de quase
              tempo real para os dias recentes.
            </p>
            <p className={PARAGRAPH}>
              A pipeline busca dados novos no FIRMS a cada hora e publica um
              lote quando algo muda; o site confere a cada minuto se saiu lote
              novo e só baixa o que mudou. As janelas de 24 e 48 horas do mapa
              vêm de arquivos com as últimas detecções. Os dados de quase tempo
              real chegam em cerca de 3 horas e são trocados pelos científicos
              de 2 a 4 meses depois. Enquanto isso, os meses que ainda têm algum
              dia de quase tempo real aparecem no calendário como{" "}
              <strong className="font-semibold">preliminares</strong>, e os
              números podem mudar.
            </p>
            <p className={PARAGRAPH}>
              Os dias seguem o horário UTC: no Brasil, um foco das 22 h cai no
              dia seguinte. Um dia só fecha depois da última passagem, perto da
              meia-noite UTC, mais o atraso do quase tempo real. Até lá ele
              aparece como <strong className="font-semibold">parcial</strong> e
              fica fora das comparações.
            </p>
            <DataFlowFigure />
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
                <StaggerList as="tbody" className="type-body-sm">
                  {SENSORS.map((sensor) => (
                    <StaggerItem
                      as="tr"
                      key={sensor.satellite}
                      className="border-t border-line"
                    >
                      <td className="type-data py-3 pr-4 text-ink">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`size-2 rounded-full ${sensor.instrument === "MODIS" ? "bg-modis" : sensor.instrument === "VIIRS" ? "bg-viirs" : "bg-heat-4"}`}
                          />
                          {sensor.instrument}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-ink">{sensor.satellite}</td>
                      <td className="py-3 pr-4 text-ink tabular-nums">
                        {sensor.since}
                      </td>
                      <td className="py-3 pr-4 text-ink">{sensor.pixel}</td>
                      <td className="py-3 pr-4 text-ink-muted">{sensor.use}</td>
                    </StaggerItem>
                  ))}
                </StaggerList>
              </table>
            </div>
          </MethodologySection>

          <MethodologySection id="filtragem">
            <StaggerList as="ul" className="grid gap-3 sm:grid-cols-2">
              {FILTERS.map((filter) => (
                <StaggerItem
                  as="li"
                  key={filter.title}
                  className={`${PANEL} flex gap-3.5 p-4`}
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink">
                    <MaterialSymbol name={filter.symbol} className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="type-body font-semibold text-ink">
                      {filter.title}
                    </span>
                    <span className="type-body-sm text-ink-muted">
                      {filter.text}
                    </span>
                  </span>
                </StaggerItem>
              ))}
            </StaggerList>
          </MethodologySection>

          <MethodologySection id="harmonizacao">
            <p className={PARAGRAPH}>
              Os dois sensores enxergam a mesma fonte de calor de jeitos
              diferentes. Para comparar 2005 com 2025, convertemos o passado
              para a régua do VIIRS S-NPP.
            </p>
            <FadeUp
              onScroll
              className="flex flex-col gap-3 rounded-md border-l-2 border-viirs bg-surface-hover px-6 py-5"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-ui text-lg leading-6 font-semibold text-ink tabular-nums">
                <span className="text-2xl">k =</span>
                <span className="inline-flex flex-col items-center text-base">
                  <span className="px-2 text-viirs-adjusted">focos S-NPP</span>
                  <span aria-hidden="true" className="h-0.5 w-full bg-ink" />
                  <span className="sr-only"> ÷ </span>
                  <span className="px-2 text-ink-muted">focos MODIS</span>
                </span>
                <span className="type-body-sm font-normal text-ink-muted">
                  de 2012 a 2019
                </span>
              </p>
              <p className="type-body-sm text-ink-muted">
                Calculado em cada bloco de 5° de latitude e longitude e para
                cada passagem: todas, dia e noite. Um foco MODIS de 2005 vira k
                focos na régua do VIIRS.
              </p>
            </FadeUp>
            <StaggerList as="ol" className="flex flex-col">
              {SERIES_STEPS.map((step, index) => (
                <StaggerItem
                  as="li"
                  key={step.period}
                  className="relative grid grid-cols-[32px_1fr] items-start gap-3 pb-5 last:pb-0"
                >
                  {index < SERIES_STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-8 bottom-1 left-[13px] w-0.5 rounded-full bg-line"
                    />
                  )}
                  <span
                    className={`type-data relative inline-flex size-7 items-center justify-center rounded-full ${step.className}`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex flex-col gap-1 pt-0.5">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-text text-base leading-6 font-semibold text-ink">
                        {step.period}
                      </span>
                      <span className="type-caption rounded-sm bg-surface-raised px-1.5 py-0.5 text-[11px] text-ink">
                        {step.sensor}
                      </span>
                    </span>
                    <span className="type-body text-ink-muted">
                      {step.text}
                    </span>
                  </span>
                </StaggerItem>
              ))}
            </StaggerList>
            <Suspense>
              <BeforeAfterChart />
            </Suspense>
            <StaggerList className="grid gap-4 sm:grid-cols-2">
              {HARMONIZATION_REASONS.map((reason) => (
                <StaggerItem
                  as="article"
                  key={reason.title}
                  className={`${PANEL} flex flex-col gap-2 p-5 last:odd:sm:col-span-2`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink">
                      <MaterialSymbol
                        name={reason.symbol}
                        className="size-[18px]"
                      />
                    </span>
                    <h3 className="type-heading-sm text-ink">{reason.title}</h3>
                  </span>
                  <p className="type-body text-ink-muted">{reason.text}</p>
                </StaggerItem>
              ))}
            </StaggerList>
          </MethodologySection>

          <MethodologySection id="validacao">
            <p className={PARAGRAPH}>
              Para testar o método, reconstruímos o S-NPP de 2020 a 2024 a
              partir do MODIS × k e comparamos mês a mês com o que o S-NPP de
              fato viu. Esses anos não entram na calibração.
            </p>
            <StaggerList as="dl" className="grid gap-3 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <StaggerItem
                  key={metric.title}
                  className="flex flex-col gap-1 border-l-2 border-line-strong py-1 pl-4"
                >
                  <dt className="type-body font-semibold text-ink">
                    {metric.title}
                  </dt>
                  <dd className="type-body-sm text-ink-muted">{metric.text}</dd>
                </StaggerItem>
              ))}
            </StaggerList>
            <p className={PARAGRAPH}>
              O selo de confiança depende do volume de focos MODIS nos anos de
              calibração:
            </p>
            <ConfidenceLegend />
            <Suspense>
              <ConfidenceScale />
            </Suspense>
            <p className={PARAGRAPH}>
              Os números da região escolhida estão no painel do topo. Num país,
              eles são um diagnóstico: a série do país usa o k de cada bloco
              onde o foco caiu. O gráfico abaixo mostra a comparação mês a mês:
              quanto mais as duas linhas andam juntas, melhor o MODIS × k
              reconstrói o que o S-NPP viu.
            </p>
            <Suspense>
              <ValidationChart />
            </Suspense>
          </MethodologySection>

          <MethodologySection id="creditos">
            <ul className={BULLET_LIST}>
              <li>
                Dados: NASA FIRMS (MODIS C6.1 e VIIRS 375 m), com dados de quase
                tempo real do LANCE.
              </li>
              <li>Fronteiras do mapa: Natural Earth 1:50m, domínio público.</li>
              <li>
                Área dos países: área de terra do Banco Mundial; para os
                territórios que ele não cobre, a área das fronteiras do CGAZ,
                que inclui lagos e rios.
              </li>
              <li>Mapa: MapLibre GL, sem mapas de terceiros.</li>
              <li>
                Globo: Three.js, com as imagens Blue Marble e Black Marble do
                NASA Earth Observatory.
              </li>
            </ul>
            <div className="flex flex-col gap-4 pt-4">
              <h3 className="type-heading-sm text-ink">Equipe</h3>
              <p className={PARAGRAPH}>
                O HERU foi feito pela equipe Mystical Magical para o NASA Space
                Apps Challenge 2026, no desafio{" "}
                <em>Harmonization of MODIS and VIIRS Hot Spots</em>.
              </p>
              <ul className="grid gap-4 sm:grid-cols-3">
                {HERU_TEAM.map((member) => (
                  <li key={member.name}>
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${PANEL} group flex h-full items-center gap-4 p-4 transition-colors duration-200 ease-standard hover:border-line-strong hover:bg-surface-hover`}
                    >
                      <Image
                        src={member.photo}
                        alt=""
                        width={64}
                        height={64}
                        className="size-16 shrink-0 rounded-full border border-line object-cover"
                      />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="type-body font-semibold text-ink">
                          {member.name}
                        </span>
                        <span className="type-body-sm text-link group-hover:underline">
                          LinkedIn
                          <span className="sr-only">, abre em nova aba</span>
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </MethodologySection>
        </div>
      </div>
    </main>
  );
}
