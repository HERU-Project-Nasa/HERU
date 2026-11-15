import type { ReactNode } from "react";
import { FireCalendarExample } from "./fire-calendar-example";
import { HarmonizedSeriesFigure } from "./harmonized-series-figure";
import { LocalizedText } from "@/i18n/localized-text";
import { PixelSizeFigure } from "./pixel-size-figure";
import { QuestionCards } from "./question-cards";
import { SatellitePassFigure } from "./satellite-pass-figure";

export type OnboardingStepContent = {
  eyebrow: ReactNode;
  title: ReactNode;
  body: ReactNode;
  nextLabel: ReactNode | null;
  figure: ReactNode | null;
  globeFrameClassName: string | null;
  wideText: boolean;
};

const MOBILE_GLOBE_FRAME =
  "bottom-[-420px] left-1/2 -ml-[330px] w-[660px] lg:bottom-auto lg:top-1/2 lg:ml-0";

const CONTINUE = <LocalizedText en="Continue" pt="Continuar" />;

export const ONBOARDING_STEPS: OnboardingStepContent[] = [
  {
    eyebrow: (
      <LocalizedText en="What satellites see" pt="O que os satélites veem" />
    ),
    title: (
      <LocalizedText
        en="For more than 20 years, satellites have been watching Earth's heat sources."
        pt="Há mais de 20 anos, satélites vigiam as fontes de calor da Terra."
      />
    ),
    body: (
      <>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en={
              <>
                From up there, they look for places too hot to be normal. Each
                time they find one, they mark a point on the map: a{" "}
                <strong className="font-semibold">hotspot</strong>.
              </>
            }
            pt={
              <>
                Lá de cima, eles procuram lugares quentes demais para serem
                normais. Cada vez que encontram um, marcam um ponto no mapa: um{" "}
                <strong className="font-semibold">foco de calor</strong>.
              </>
            }
          />
        </p>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="A point does not show how big the heat source is. It is just the place where the satellite sensed the heat."
            pt="Um ponto não mostra o tamanho da fonte de calor. É só o lugar onde o satélite sentiu o calor."
          />
        </p>
      </>
    ),
    nextLabel: CONTINUE,
    figure: null,
    globeFrameClassName: `${MOBILE_GLOBE_FRAME} lg:left-[47%] lg:-mt-[620px] lg:w-[1240px]`,
    wideText: false,
  },
  {
    eyebrow: <LocalizedText en="A scare in the data" pt="Um susto nos dados" />,
    title: (
      <LocalizedText
        en="In 2012, hotspots in the United States nearly quadrupled."
        pt="Em 2012, os focos de calor nos Estados Unidos quase quadruplicaram."
      />
    ),
    body: (
      <>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="At least that is what shows up when we put together everything the satellites recorded: 2012 has almost four times the hotspots of 2011."
            pt="Pelo menos é o que aparece quando juntamos tudo o que os satélites registraram: o ano de 2012 tem quase quatro vezes os focos de 2011."
          />
        </p>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="It looks like a disastrous year. But did the heat sources really change that much from one year to the next?"
            pt="Parece um ano trágico. Mas será que as fontes de calor mudaram tanto assim de um ano para o outro?"
          />
        </p>
      </>
    ),
    nextLabel: <LocalizedText en="So what changed?" pt="Então o que mudou?" />,
    figure: <SatellitePassFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: <LocalizedText en="What changed" pt="O que mudou" />,
    title: (
      <LocalizedText
        en="In 2012, a sharper sensor came online."
        pt="Em 2012, um sensor mais atento entrou em órbita."
      />
    ),
    body: (
      <>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="MODIS sees Earth in 1 km squares. VIIRS, which started sending data in 2012, uses 375 m squares: about seven of them fit in one MODIS square."
            pt="O MODIS enxerga a Terra em quadrados de 1 km. O VIIRS, que começou a mandar dados em 2012, usa quadrados de 375 m: cabem cerca de sete deles em um quadrado do MODIS."
          />
        </p>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="With a finer lens, it finds small heat sources that MODIS used to miss. The heat sources did not increase. The scale changed."
            pt="Com uma lente mais fina, ele encontra fontes de calor pequenas que o MODIS deixava passar. As fontes de calor não aumentaram. A régua mudou."
          />
        </p>
      </>
    ),
    nextLabel: (
      <LocalizedText en="So how do we compare?" pt="E como comparar?" />
    ),
    figure: <PixelSizeFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: <LocalizedText en="Our solution" pt="A nossa solução" />,
    title: (
      <LocalizedText
        en="HERU puts both sensors on the same scale."
        pt="O HERU coloca os dois sensores na mesma régua."
      />
    ),
    body: (
      <>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="In the years when both fly together, we compare what each one saw in the same place on the same day. That relationship converts the whole series to a single scale: the VIIRS equivalent."
            pt="Nos anos em que os dois voam juntos, comparamos o que cada um viu no mesmo lugar e no mesmo dia. Essa relação converte a série inteira para uma escala só: o equivalente VIIRS."
          />
        </p>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="In the United States, the 2012 jump disappears: on the same scale, 2012 comes out almost equal to 2011. A jump in the chart now means more heat sources, not a new sensor."
            pt="Nos Estados Unidos, o salto de 2012 some: na mesma régua, 2012 fica quase igual a 2011. Um salto no gráfico passa a significar mais fontes de calor, e não um sensor novo."
          />
        </p>
      </>
    ),
    nextLabel: CONTINUE,
    figure: <HarmonizedSeriesFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: (
      <LocalizedText en="How to read the calendar" pt="Como ler o calendário" />
    ),
    title: (
      <LocalizedText
        en="Every place has its own rhythm of heat sources."
        pt="Cada lugar tem o seu ritmo de fontes de calor."
      />
    ),
    body: (
      <>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="In the calendar, each row is a year and each column is a month. The taller and redder the block, the more hotspots."
            pt="No calendário, cada linha é um ano e cada coluna, um mês. Quanto mais alto e mais vermelho o bloco, mais focos de calor."
          />
        </p>
        <p className="type-body-lg text-ink">
          <LocalizedText
            en="Outlined months are unusual: they had far more hotspots than is typical for that time of year."
            pt="Os meses com contorno fugiram do padrão: tiveram muito mais focos do que o típico para a época."
          />
        </p>
      </>
    ),
    nextLabel: CONTINUE,
    figure: <FireCalendarExample />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: <LocalizedText en="Now it's your turn" pt="Agora é com você" />,
    title: (
      <LocalizedText
        en="What do you want to find out?"
        pt="O que você quer descobrir?"
      />
    ),
    body: (
      <div className="mt-4">
        <QuestionCards />
      </div>
    ),
    nextLabel: null,
    figure: null,
    globeFrameClassName: `${MOBILE_GLOBE_FRAME} lg:left-[58%] lg:-mt-[550px] lg:w-[1100px]`,
    wideText: true,
  },
];
