import type { ReactNode } from "react";
import { FireCalendarExample } from "./fire-calendar-example";
import { HarmonizedSeriesFigure } from "./harmonized-series-figure";
import { PixelSizeFigure } from "./pixel-size-figure";
import { QuestionCards } from "./question-cards";
import { SatellitePassFigure } from "./satellite-pass-figure";

export type OnboardingStepContent = {
  eyebrow: string;
  title: string;
  body: ReactNode;
  nextLabel: string | null;
  figure: ReactNode | null;
  globeFrameClassName: string | null;
  wideText: boolean;
};

const MOBILE_GLOBE_FRAME =
  "bottom-[-420px] left-1/2 -ml-[330px] w-[660px] lg:bottom-auto lg:top-1/2 lg:ml-0";

export const ONBOARDING_STEPS: OnboardingStepContent[] = [
  {
    eyebrow: "O que os satélites veem",
    title: "Há mais de 20 anos, satélites vigiam o fogo na Terra.",
    body: (
      <>
        <p className="type-body-lg text-ink">
          Lá de cima, eles procuram lugares quentes demais para serem normais.
          Cada vez que encontram um, marcam um ponto no mapa: um{" "}
          <strong className="font-semibold">foco de calor</strong>.
        </p>
        <p className="type-body-lg text-ink">
          Um ponto não é um incêndio inteiro. É o lugar onde o satélite sentiu o
          calor.
        </p>
      </>
    ),
    nextLabel: "Continuar",
    figure: null,
    globeFrameClassName: `${MOBILE_GLOBE_FRAME} lg:left-[47%] lg:-mt-[620px] lg:w-[1240px]`,
    wideText: false,
  },
  {
    eyebrow: "Um susto nos dados",
    title: "Em 2012, os focos de calor na Bolívia quase quintuplicaram.",
    body: (
      <>
        <p className="type-body-lg text-ink">
          Pelo menos é o que aparece quando juntamos tudo o que os satélites
          registraram.
        </p>
        <p className="type-body-lg text-ink">
          Parece uma tragédia. Mas, naquele ano, nada fora do comum aconteceu
          nas matas bolivianas.
        </p>
      </>
    ),
    nextLabel: "Então o que mudou?",
    figure: <SatellitePassFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: "O que mudou",
    title: "Em 2012, um sensor mais atento entrou em órbita.",
    body: (
      <>
        <p className="type-body-lg text-ink">
          O MODIS enxerga a Terra em quadrados de 1 km. O VIIRS, que começou a
          mandar dados em 2012, usa quadrados de 375 m: cabem cerca de sete
          deles em um quadrado do MODIS.
        </p>
        <p className="type-body-lg text-ink">
          Com uma lente mais fina, ele encontra fogos pequenos que o MODIS
          deixava passar. O fogo não aumentou. A régua mudou.
        </p>
      </>
    ),
    nextLabel: "E como comparar?",
    figure: <PixelSizeFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: "A nossa solução",
    title: "O HERU coloca os dois sensores na mesma régua.",
    body: (
      <>
        <p className="type-body-lg text-ink">
          Nos anos em que os dois voam juntos, comparamos o que cada um viu no
          mesmo lugar e no mesmo dia. Essa relação converte a série inteira para
          uma escala só: o equivalente VIIRS.
        </p>
        <p className="type-body-lg text-ink">
          Assim, um salto no gráfico passa a significar mais fogo, e não um
          sensor novo.
        </p>
      </>
    ),
    nextLabel: "Continuar",
    figure: <HarmonizedSeriesFigure />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: "Como ler o calendário",
    title: "Cada lugar tem o seu ritmo de fogo.",
    body: (
      <>
        <p className="type-body-lg text-ink">
          No calendário, cada linha é um ano e cada coluna, um mês. Quanto mais
          clara a célula, mais focos de calor.
        </p>
        <p className="type-body-lg text-ink">
          Os meses com contorno fugiram do padrão: tiveram muito mais focos do
          que o típico para a época.
        </p>
      </>
    ),
    nextLabel: "Continuar",
    figure: <FireCalendarExample />,
    globeFrameClassName: null,
    wideText: false,
  },
  {
    eyebrow: "Agora é com você",
    title: "O que você quer descobrir?",
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
