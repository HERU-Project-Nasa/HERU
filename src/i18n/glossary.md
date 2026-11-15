# HERU translation glossary

English is the default language; Portuguese (Brasil) is the alternative. Use the
same English term for the same idea everywhere, so a reader never wonders whether
two words mean two things.

## Terms

| Portuguese                           | English                                | Notes                                                              |
| ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------ |
| foco, foco de calor                  | hotspot                                | Never "fire". A hotspot is a thermal anomaly, not proof of a fire. |
| fonte de calor                       | heat source                            |                                                                    |
| focos equivalentes VIIRS             | VIIRS-equivalent hotspots              |                                                                    |
| harmonizado, harmonização            | harmonized, harmonization              | US spelling.                                                       |
| série harmonizada                    | harmonized series                      |                                                                    |
| bruto                                | raw                                    | "MODIS hotspots, raw"                                              |
| Só MODIS / Só VIIRS                  | MODIS only / VIIRS only                |                                                                    |
| típico, o típico                     | typical                                | "22% above typical", "2.1× typical", "same as typical"             |
| mediana                              | median                                 |                                                                    |
| faixa usual                          | usual range                            | Between 25% and 75% of the years.                                  |
| dentro / acima / abaixo da faixa     | within / above / below the usual range |                                                                    |
| fora do padrão (mês)                 | unusual (month)                        | Card title: "Unusual months".                                      |
| temporada crítica                    | peak season                            |                                                                    |
| ano recorde                          | record year                            |                                                                    |
| último mês fechado                   | last full month                        |                                                                    |
| mês corrente                         | current month                          |                                                                    |
| dia completo / parcial               | complete day / partial                 |                                                                    |
| preliminar                           | preliminary                            |                                                                    |
| quase tempo real                     | near real-time (NRT)                   |                                                                    |
| produto científico                   | science product                        | FIRMS standard processing.                                         |
| passagem (do satélite)               | overpass                               | "all overpasses", "daytime overpasses only"                        |
| dia / noite                          | day / night (daytime / nighttime)      |                                                                    |
| bloco de 5°                          | 5° block                               |                                                                    |
| célula / quadrado de 0,25°           | 0.25° cell                             |                                                                    |
| fator k, k20                         | factor k, k20                          |                                                                    |
| calibração, anos de calibração       | calibration, calibration years         |                                                                    |
| validação                            | validation                             |                                                                    |
| erro mediano mensal                  | median monthly error                   |                                                                    |
| correlação r                         | correlation r                          |                                                                    |
| concordância de país                 | country agreement                      |                                                                    |
| confiança alta / média / baixa       | high / medium / low confidence         |                                                                    |
| deriva de órbita                     | orbital drift                          |                                                                    |
| p.p. (pontos percentuais)            | pp (percentage points)                 | "6 pp below typical"                                               |
| Calendário / Anomalias / Metodologia | Calendar / Anomalies / Methodology     | Navigation.                                                        |
| Relatórios                           | Reports                                |                                                                    |
| Ver evidências                       | See evidence                           |                                                                    |
| Baixar CSV                           | Download CSV                           |                                                                    |
| Ver no calendário                    | See on calendar                        |                                                                    |
| Região / Mundo / Continente / País   | Region / World / Continent / Country   |                                                                    |
| Fonte (do calendário)                | Source                                 | Harmonized / MODIS only / VIIRS only                               |
| Contagem / Anomalia (modo)           | Count / Anomaly                        |                                                                    |
| Período / Passagens / Sensor         | Period / Overpasses / Sensor           |                                                                    |
| Automático                           | Automatic                              |                                                                    |
| Estações do ano                      | Seasons                                | Summer / Autumn / Winter / Spring                                  |
| Comparar datas / regiões             | Compare dates / Compare regions        |                                                                    |
| Carregando                           | Loading                                |                                                                    |
| em cálculo                           | being computed                         |                                                                    |
| sem dado                             | no data                                |                                                                    |
| régua (metáfora da escala)           | scale                                  | "the VIIRS scale", "on the same scale", "reference scale"          |
| fontes fixas                         | static sources                         | FIRMS term.                                                        |
| Provisório (NRT) / Definitivo (SP)   | Preliminary (NRT) / Final (SP)         |                                                                    |
| soma bruta / reconstruído            | raw sum / reconstructed                |                                                                    |
| selo de confiança                    | confidence badge                       |                                                                    |
| mês escolhido                        | selected month                         | Also "selected period", "selected season".                         |
| mês em andamento                     | current month                          | Same as "mês corrente".                                            |
| mais ativo / menos ativo             | busiest / least active                 | "9th busiest March in 24 years" (use `ordinal`).                   |
| Posição                              | Rank                                   |                                                                    |
| Origem (do valor)                    | Origin                                 |                                                                    |
| referência (sem referência)          | baseline (no baseline)                 |                                                                    |
| faixa (do satélite)                  | swath                                  |                                                                    |
| Filtros de pesquisa                  | Search filters                         |                                                                    |
| Ajustes do calendário                | Calendar settings                      |                                                                    |
| Dados até X                          | Data through X                         |                                                                    |

## Style

- Plain, short English. Sentence case for headings and buttons (the CSS adds
  uppercase where the design wants it).
- Numbers and dates follow the language: "8,551" and "Nov 13, 2026" in English,
  "8.551" and "13/11/2026" in Portuguese. Use the helpers, never hand-written
  separators.
- Months are capitalized in English ("March 2024") and lowercase in Portuguese
  ("março de 2024").

## How to translate code

- A component that shows text calls `const t = useTr()` and writes
  `t("English", "Português")`. JSX works too: `t(<>Bold <strong>x</strong></>, <>Negrito <strong>x</strong></>)`.
- Code outside React (label builders) uses `tr(en, pt)` from `@/i18n/locale`.
- Text inside a server component uses `<LocalizedText en="…" pt="…" />` from
  `@/i18n/localized-text`. `metadata` stays English; `LocaleDocument` shows the
  Portuguese page title in the browser (add new titles to its list).
- A `useMemo` that builds text wraps its body in `inLocale(locale, () => …)` and
  lists `locale` in its dependencies.
- A module-level array or record of labels is wrapped in `localized(en, pt)`,
  with the same shape in both languages.
- Formatters: `localNumberFormat(options)` and `localDateFormat(options)` from
  `@/i18n/format` instead of `new Intl.NumberFormat("pt-BR", ...)`;
  `compareLabels(a, b)` instead of `a.localeCompare(b, "pt-BR")`.
- Shared phrases live in `@/fire-calendar/calendar-labels`: `formatHotspots`,
  `hotspotsWord`, `yearsLabel`, `monthsLabel`, `ordinal`, `monthTitle`,
  `formatDayMonth`, `formatFullDate`, `difference`, `sinceLabel`, `baselineLabel`.
- `useMemo` / `useCallback` that build text list `locale` (from `useLocale()`)
  in their dependencies.
