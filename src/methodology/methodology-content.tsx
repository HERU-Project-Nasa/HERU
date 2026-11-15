"use client";

import Image from "next/image";
import { Suspense } from "react";
import { localized, useTr } from "@/i18n/locale";
import { MaterialSymbol, type SymbolName } from "@/icons/material-symbols";
import { StaggerItem, StaggerList } from "@/motion/chart-motion";
import { FadeUp } from "@/motion/fade-up";
import { HERU_TEAM } from "@/team/heru-team";
import { BeforeAfterChart } from "./before-after-chart";
import { DataFlowFigure } from "./data-flow-figure";
import {
  ConfidenceLegend,
  ConfidenceScale,
  MethodologyDates,
  MethodologyFigures,
  MethodologyFiles,
} from "./methodology-figures";
import { MethodologySection } from "./methodology-sections";
import { PixelScaleFigure } from "./pixel-scale-figure";
import { SectionContents } from "./section-contents";
import { SensorTimeline } from "./sensor-timeline";
import { ValidationChart } from "./validation-chart";

type Sensor = {
  instrument: string;
  satellite: string;
  since: string;
  pixel: string;
  use: string;
};

const SENSORS = localized<Sensor[]>(
  [
    {
      instrument: "MODIS",
      satellite: "Terra",
      since: "Nov 2000",
      pixel: "~1 km",
      use: "2003 to 2011, multiplied by k",
    },
    {
      instrument: "MODIS",
      satellite: "Aqua",
      since: "Jul 2002",
      pixel: "~1 km",
      use: "2003 to 2011, multiplied by k",
    },
    {
      instrument: "VIIRS",
      satellite: "Suomi NPP",
      since: "Jan 20, 2012",
      pixel: "375 m",
      use: "Jan 20, 2012 to Nov 2, 2026, as observed",
    },
    {
      instrument: "VIIRS",
      satellite: "NOAA-20",
      since: "Apr 1, 2018",
      pixel: "375 m",
      use: "From Nov 3, 2026, multiplied by k20",
    },
    {
      instrument: "VIIRS",
      satellite: "NOAA-21",
      since: "Mar 1, 2023",
      pixel: "375 m",
      use: "Not in the harmonized series",
    },
    {
      instrument: "OLI",
      satellite: "Landsat 8 and 9",
      since: "Jun 20, 2022",
      pixel: "30 m",
      use: "US and Canada only; not in the calendar",
    },
  ],
  [
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
  ],
);

const SENSOR_COLUMNS = localized(
  ["Sensor", "Satellite", "Since", "Pixel", "Use in HERU"],
  ["Sensor", "Satélite", "Desde", "Pixel", "Uso no HERU"],
);

type SeriesStep = {
  period: string;
  sensor: string;
  className: string;
  text: string;
};

const SERIES_STEPS = localized<SeriesStep[]>(
  [
    {
      period: "2003 to 2011",
      sensor: "MODIS × k",
      className: "bg-modis text-surface-ground",
      text: "Only MODIS exists. Each MODIS hotspot becomes k VIIRS-equivalent hotspots, using the k of the 5° block where it fell.",
    },
    {
      period: "January 20, 2012 to November 2, 2026",
      sensor: "VIIRS S-NPP",
      className: "bg-viirs text-ink",
      text: "We use Suomi NPP VIIRS as it was observed. Nothing is adjusted.",
    },
    {
      period: "November 3, 2026 onward",
      sensor: "NOAA-20 × k20",
      className: "bg-viirs-adjusted text-surface-ground",
      text: "S-NPP stopped observing. NOAA-20 takes over, multiplied by k20 = S-NPP hotspots ÷ NOAA-20 hotspots, over full years from 2019 to 2025, also per 5° block.",
    },
  ],
  [
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
  ],
);

type Reason = { title: string; symbol: SymbolName; text: string };

const HARMONIZATION_REASONS = localized<Reason[]>(
  [
    {
      title: "Why VIIRS is the reference",
      symbol: "straighten",
      text: "MODIS is at the end of its service life. With VIIRS as the reference, all new data comes in without conversion, and only the past is adjusted.",
    },
    {
      title: "Why one k per 5° block",
      symbol: "map",
      text: "The ratio between the sensors changes from one region to another. A single factor for the whole world would be wrong almost everywhere, so each MODIS hotspot uses the k of its block. A block with fewer than 1,000 hotspots in the calibration years uses the world k.",
    },
    {
      title: "Why one k per overpass",
      symbol: "sunny",
      text: "At night, VIIRS finds far more hotspots than MODIS, much more so than during the day. A single k would distort the day and night filter. That is why day plus night does not add up exactly to the total.",
    },
    {
      title: "Why add up hotspot by hotspot",
      symbol: "bar_chart",
      text: "A country's total adds up each hotspot after conversion. A block or a cell on the border can hold hotspots from two countries, so the total is not the sum of the cells.",
    },
    {
      title: "Why calibrate on 2012-2019",
      symbol: "date_range",
      text: "From 2020 on, the orbital drift of MODIS changes the count. Since the series only uses MODIS through 2011, the drift does not affect the result. k20 uses full years from 2019 to 2025, all from the science product, to cover every season equally.",
    },
  ],
  [
    {
      title: "Por que a régua é o VIIRS",
      symbol: "straighten",
      text: "O MODIS está no fim da vida útil. Com o VIIRS como referência, todo dado novo entra sem conversão, e só o passado é ajustado.",
    },
    {
      title: "Por que um k por bloco de 5°",
      symbol: "map",
      text: "A razão entre os sensores muda de uma região para outra. Um fator único para o mundo erraria em quase toda parte, então cada foco MODIS usa o k do seu bloco. Um bloco com menos de 1.000 focos nos anos de calibração usa o k do mundo.",
    },
    {
      title: "Por que um k por passagem",
      symbol: "sunny",
      text: "À noite, o VIIRS encontra muito mais focos que o MODIS do que de dia. Um k único distorceria o filtro de dia e noite. Por isso, a soma de dia e noite não dá exatamente o total.",
    },
    {
      title: "Por que somar foco a foco",
      symbol: "bar_chart",
      text: "O total de um país soma cada foco já convertido. Um bloco ou uma célula na fronteira pode ter focos de dois países, por isso o total não é a soma das células.",
    },
    {
      title: "Por que calibrar em 2012-2019",
      symbol: "date_range",
      text: "A partir de 2020, a deriva das órbitas do MODIS muda a contagem. Como a série só usa o MODIS até 2011, a deriva não entra no resultado. O k20 usa anos inteiros de 2019 a 2025, todos do produto científico, para cobrir todas as estações do ano por igual.",
    },
  ],
);

type Filter = { symbol: SymbolName; title: string; text: string };

const FILTERS = localized<Filter[]>(
  [
    {
      symbol: "eco",
      title: "Vegetation only",
      text: "In the science product, which gives the type of each hotspot, only vegetation hotspots (type 0) are kept. Volcanoes, other static land sources, and offshore detections are left out.",
    },
    {
      symbol: "flag",
      title: "No known static sources",
      text: "In near real-time (NRT) data, which has no type, we drop hotspots that fall on known static heat sources, such as refineries, gas fields, and industrial plants, marked on a 0.01° grid.",
    },
    {
      symbol: "verified",
      title: "Every confidence level counts",
      text: "All confidence levels are kept, because VIIRS never flags low confidence at night.",
    },
    {
      symbol: "bar_chart",
      title: "Hotspot-by-hotspot count",
      text: "We count hotspot by hotspot for each country and for the world, by day, month, and year, keeping day and night apart. For the map, also by 0.25° cell and month. Offshore hotspots count toward the world total, but not toward any country.",
    },
    {
      symbol: "map",
      title: "0.25° cells on the map",
      text: "On the map for long periods, each 0.25° cell (about 28 km) adds up the hotspots that fell in it. We show every cell that touches the country, even if its center falls in the sea or in a neighbor, so that none of the country's hotspots is left out; on a small island such as Saint Lucia, no cell center falls on land. On the border, a cell can include hotspots from the neighbor, but the period total does not change, because it is counted hotspot by hotspot.",
    },
    {
      symbol: "calendar_month",
      title: "Starting in 2002",
      text: "The harmonized series starts in July 2002, when Aqua began observing. Before that, only Terra was observing, and the count drops by half without any change in the heat sources. The calendar starts in 2003, the first full year with both.",
    },
  ],
  [
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
  ],
);

type Metric = { title: string; text: string };

const METRICS = localized<Metric[]>(
  [
    {
      title: "Median monthly error",
      text: "Half of the months have a smaller error than this value.",
    },
    {
      title: "Correlation r",
      text: "How closely the reconstruction follows the observed S-NPP, on a log scale; 1 is a perfect match.",
    },
    {
      title: "Months used",
      text: "How many months went into the comparison. With few months, the error says little.",
    },
    {
      title: "Country agreement",
      text: "The share of the country's hotspots for which the border used by the pipeline gives the same country as the FIRMS file. The target is 99% or more.",
    },
  ],
  [
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
  ],
);

const PARAGRAPH = "type-body max-w-[680px] text-ink";
const BULLET_LIST =
  "type-body flex max-w-[680px] list-disc flex-col gap-2.5 pl-5 text-ink";
const PANEL = "rounded-md border border-line bg-surface";

export function MethodologyContent() {
  const t = useTr();
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
              <p className="type-eyebrow text-ink-muted">
                {t("Methodology", "Metodologia")}
              </p>
              <h1 className="type-heading-lg lg:type-heading-xl text-ink">
                {t(
                  "How HERU puts 24 years from two sensors on the same scale",
                  "Como o HERU põe 24 anos de dois sensores na mesma escala",
                )}
              </h1>
              <p className="type-body-lg max-w-[680px] text-ink-muted">
                {t(
                  "Where the numbers come from, how they were adjusted, and how far you can trust them. It takes about two minutes.",
                  "De onde vêm os números, como foram ajustados e até onde dá para confiar neles. Leva cerca de dois minutos.",
                )}
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
              {t(
                "A hotspot is a pixel where the satellite detected a thermal anomaly during an overpass. It does not show the size of the heat source: a large source can produce dozens of hotspots, and a small one, or one covered by clouds, may not show up at all.",
                "Um foco é um pixel em que o satélite detectou uma anomalia térmica durante uma passagem. Ele não mostra o tamanho da fonte de calor: uma fonte grande pode gerar dezenas de focos, e uma pequena, ou coberta por nuvens, pode não aparecer.",
              )}
            </p>
            <p className={PARAGRAPH}>
              {t(
                <>
                  Agricultural management, waste disposal, and industrial
                  activity also produce hotspots. That is why we always speak of
                  detected{" "}
                  <strong className="font-semibold">heat sources</strong>.
                </>,
                <>
                  Manejo agrícola, descarte de resíduos e atividades industriais
                  também geram focos. Por isso falamos sempre em{" "}
                  <strong className="font-semibold">fontes de calor</strong>{" "}
                  detectadas.
                </>,
              )}
            </p>
            <PixelScaleFigure />
          </MethodologySection>

          <MethodologySection id="fontes">
            <p className={PARAGRAPH}>
              {t(
                "Everything comes from NASA FIRMS (Fire Information for Resource Management System): the science products for the history and the near real-time (NRT) products for recent days.",
                "Tudo vem do NASA FIRMS (Fire Information for Resource Management System): os produtos científicos para o histórico e os de quase tempo real para os dias recentes.",
              )}
            </p>
            <p className={PARAGRAPH}>
              {t(
                <>
                  The pipeline checks FIRMS for new data every hour and
                  publishes a batch when something changes; the site checks
                  every minute for a new batch and downloads only what changed.
                  The 24- and 48-hour windows on the map come from files with
                  the latest detections. Near real-time data arrives in about 3
                  hours and is replaced by science data 2 to 4 months later.
                  Until then, months that still have any near real-time day show
                  up on the calendar as{" "}
                  <strong className="font-semibold">preliminary</strong>, and
                  the numbers may change.
                </>,
                <>
                  A pipeline busca dados novos no FIRMS a cada hora e publica um
                  lote quando algo muda; o site confere a cada minuto se saiu
                  lote novo e só baixa o que mudou. As janelas de 24 e 48 horas
                  do mapa vêm de arquivos com as últimas detecções. Os dados de
                  quase tempo real chegam em cerca de 3 horas e são trocados
                  pelos científicos de 2 a 4 meses depois. Enquanto isso, os
                  meses que ainda têm algum dia de quase tempo real aparecem no
                  calendário como{" "}
                  <strong className="font-semibold">preliminares</strong>, e os
                  números podem mudar.
                </>,
              )}
            </p>
            <p className={PARAGRAPH}>
              {t(
                <>
                  Days follow UTC time: in Brazil, a hotspot at 22:00 falls on
                  the next day. A day only closes after the last overpass, near
                  midnight UTC, plus the near real-time delay. Until then it
                  shows as <strong className="font-semibold">partial</strong>{" "}
                  and is left out of comparisons.
                </>,
                <>
                  Os dias seguem o horário UTC: no Brasil, um foco das 22 h cai
                  no dia seguinte. Um dia só fecha depois da última passagem,
                  perto da meia-noite UTC, mais o atraso do quase tempo real.
                  Até lá ele aparece como{" "}
                  <strong className="font-semibold">parcial</strong> e fica fora
                  das comparações.
                </>,
              )}
            </p>
            <DataFlowFigure />
            <SensorTimeline />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr>
                    {SENSOR_COLUMNS.map((column, index) => (
                      <th
                        key={index}
                        scope="col"
                        className="type-caption pr-4 pb-3 font-normal text-ink-muted"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <StaggerList as="tbody" className="type-body-sm">
                  {SENSORS.map((sensor, index) => (
                    <StaggerItem
                      as="tr"
                      key={index}
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
                  key={filter.symbol}
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
              {t(
                "The two sensors see the same heat source in different ways. To compare 2005 with 2025, we convert the past to the VIIRS S-NPP scale.",
                "Os dois sensores enxergam a mesma fonte de calor de jeitos diferentes. Para comparar 2005 com 2025, convertemos o passado para a régua do VIIRS S-NPP.",
              )}
            </p>
            <FadeUp
              onScroll
              className="flex flex-col gap-3 rounded-md border-l-2 border-viirs bg-surface-hover px-6 py-5"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-ui text-lg leading-6 font-semibold text-ink tabular-nums">
                <span className="text-2xl">k =</span>
                <span className="inline-flex flex-col items-center text-base">
                  <span className="px-2 text-viirs-adjusted">
                    {t("S-NPP hotspots", "focos S-NPP")}
                  </span>
                  <span aria-hidden="true" className="h-0.5 w-full bg-ink" />
                  <span className="sr-only"> ÷ </span>
                  <span className="px-2 text-ink-muted">
                    {t("MODIS hotspots", "focos MODIS")}
                  </span>
                </span>
                <span className="type-body-sm font-normal text-ink-muted">
                  {t("from 2012 to 2019", "de 2012 a 2019")}
                </span>
              </p>
              <p className="type-body-sm text-ink-muted">
                {t(
                  "Computed in each 5° block of latitude and longitude and for each set of overpasses: all, day, and night. A MODIS hotspot from 2005 becomes k hotspots on the VIIRS scale.",
                  "Calculado em cada bloco de 5° de latitude e longitude e para cada passagem: todas, dia e noite. Um foco MODIS de 2005 vira k focos na régua do VIIRS.",
                )}
              </p>
            </FadeUp>
            <StaggerList as="ol" className="flex flex-col">
              {SERIES_STEPS.map((step, index) => (
                <StaggerItem
                  as="li"
                  key={step.sensor}
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
                  key={reason.symbol}
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
              {t(
                "To test the method, we rebuilt S-NPP from 2020 to 2024 from MODIS × k and compared it month by month with what S-NPP actually saw. These years are not part of the calibration.",
                "Para testar o método, reconstruímos o S-NPP de 2020 a 2024 a partir do MODIS × k e comparamos mês a mês com o que o S-NPP de fato viu. Esses anos não entram na calibração.",
              )}
            </p>
            <StaggerList as="dl" className="grid gap-3 sm:grid-cols-2">
              {METRICS.map((metric, index) => (
                <StaggerItem
                  key={index}
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
              {t(
                "The confidence badge depends on the volume of MODIS hotspots in the calibration years:",
                "O selo de confiança depende do volume de focos MODIS nos anos de calibração:",
              )}
            </p>
            <ConfidenceLegend />
            <Suspense>
              <ConfidenceScale />
            </Suspense>
            <p className={PARAGRAPH}>
              {t(
                "The numbers for the chosen region are in the panel at the top. For a country, they are a diagnostic: the country's series uses the k of each block where the hotspot fell. The chart below shows the month-by-month comparison: the more closely the two lines move together, the better MODIS × k reconstructs what S-NPP saw.",
                "Os números da região escolhida estão no painel do topo. Num país, eles são um diagnóstico: a série do país usa o k de cada bloco onde o foco caiu. O gráfico abaixo mostra a comparação mês a mês: quanto mais as duas linhas andam juntas, melhor o MODIS × k reconstrói o que o S-NPP viu.",
              )}
            </p>
            <Suspense>
              <ValidationChart />
            </Suspense>
          </MethodologySection>

          <MethodologySection id="creditos">
            <ul className={BULLET_LIST}>
              <li>
                {t(
                  "Data: NASA FIRMS (MODIS C6.1 and VIIRS 375 m), with near real-time data from LANCE.",
                  "Dados: NASA FIRMS (MODIS C6.1 e VIIRS 375 m), com dados de quase tempo real do LANCE.",
                )}
              </li>
              <li>
                {t(
                  "Map borders: Natural Earth 1:50m, public domain.",
                  "Fronteiras do mapa: Natural Earth 1:50m, domínio público.",
                )}
              </li>
              <li>
                {t(
                  "Country area: World Bank land area; for territories it does not cover, the area of the CGAZ borders, which includes lakes and rivers.",
                  "Área dos países: área de terra do Banco Mundial; para os territórios que ele não cobre, a área das fronteiras do CGAZ, que inclui lagos e rios.",
                )}
              </li>
              <li>
                {t(
                  "Map: MapLibre GL, with no third-party maps.",
                  "Mapa: MapLibre GL, sem mapas de terceiros.",
                )}
              </li>
              <li>
                {t(
                  "Globe: Three.js, with the Blue Marble and Black Marble images from the NASA Earth Observatory.",
                  "Globo: Three.js, com as imagens Blue Marble e Black Marble do NASA Earth Observatory.",
                )}
              </li>
            </ul>
            <div className="flex flex-col gap-4 pt-4">
              <h3 className="type-heading-sm text-ink">
                {t("Team", "Equipe")}
              </h3>
              <p className={PARAGRAPH}>
                {t(
                  <>
                    HERU was built by the Mystical Magical team for the NASA
                    Space Apps Challenge 2026, in the{" "}
                    <em>Harmonization of MODIS and VIIRS Hot Spots</em>{" "}
                    challenge.
                  </>,
                  <>
                    O HERU foi feito pela equipe Mystical Magical para o NASA
                    Space Apps Challenge 2026, no desafio{" "}
                    <em>Harmonization of MODIS and VIIRS Hot Spots</em>.
                  </>,
                )}
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
                          <span className="sr-only">
                            {t(", opens in a new tab", ", abre em nova aba")}
                          </span>
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
