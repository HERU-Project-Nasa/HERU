# HERU

A monthly calendar of fire hotspots for every country and for the whole world, built from the MODIS and VIIRS active fire detections in NASA FIRMS. The two sensors see fire at different resolutions, so their raw counts cannot be compared across the 2012 switch from MODIS to VIIRS. HERU puts both records on the same scale, from 2003 to the present, and marks the typical fire season and the months that stand out from it.

Built for the NASA Space Apps Challenge 2026 challenge "Harmonization of MODIS and VIIRS Hot Spots".

## Data

- Active fire detections: NASA FIRMS, MODIS Collection 6.1 (Terra and Aqua) and VIIRS 375 m (Suomi NPP, NOAA-20), standard and near real-time products.
- Country boundaries in `public/geo`: Natural Earth 1:50m Admin 0 countries, version 5.1.2 (public domain), reduced to the country code and outline, with coordinates rounded to 0.01 degree.
- Country areas: World Bank land area, published by the pipeline in `meta/countries.csv`; the few territories the World Bank does not cover use the CGAZ boundary area, which includes lakes and rivers.
- Home globe imagery in `public/globe`, resized from NASA Earth Observatory: Blue Marble: Next Generation, November 2004 with topography (Reto Stöckli), Black Marble 2016 (Joshua Stevens, with Suomi NPP VIIRS data from Miguel Román, NASA Goddard Space Flight Center), and an ocean mask taken from the GEBCO_08 bathymetry distributed with Blue Marble.

We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).

## Running

Requires Node.js 24 or later.

```sh
npm install
npm run dev
```

Other scripts: `npm test`, `npm run lint`, `npm run build`, `npm run format`.

The pages read the pipeline files from `/v1/`, or from the address in `NEXT_PUBLIC_HERU_BASE`. In development, `/v1/` is forwarded to a local static server at `http://127.0.0.1:8000`, or at the address in `HERU_PIPELINE_DEV_SERVER`. To use a copy of the pipeline output, serve the folder that contains `v1/`:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory path/to/pipeline-output
```

## Deploy

`npm run build` writes a static site to `out/`. The site and the pipeline output live on the same server and domain: nginx serves `out/` at `/` and the pipeline's `saida/v1/` at `/v1/`, so `NEXT_PUBLIC_HERU_BASE` stays empty and no CORS is needed.

```nginx
server {
    root /path/to/HERU/out;
    location / {
        try_files $uri $uri/ =404;
    }
    location /v1/ {
        alias /path/to/saida/v1/;
        add_header Cache-Control "no-cache";
    }
}
```

## Pipeline files

The pipeline publishes small CSV files that the site reads as they are. The calendar uses:

| File                                      | Use                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `meta/latest.csv`                         | Number of the last batch, read first and checked every minute                                                       |
| `meta/batches/{batch}.csv`                | Files changed by a batch, so only those are read again                                                              |
| `meta/coverage.csv`                       | First and last day of each layer, which separates "not loaded" from 0, and `complete_date`, the last closed UTC day |
| `meta/countries.csv`                      | Countries in the region filter, with `area_km2` and `area_source` for the territory on the filter page              |
| `series/countries/{ISO3}/monthly.csv`     | The calendar of a country                                                                                           |
| `series/countries/{ISO3}/daily.csv`       | The current month against the same days of earlier years                                                            |
| `series/global/monthly.csv`, `daily.csv`  | The same for the whole world                                                                                        |
| `series/countries_yearly.csv`             | Hotspots of every country by year in one file, for the filter page                                                  |
| `points/{layer}/{year}/{date}.csv.gz`     | Hotspots of each day on the map, for periods up to 7 days                                                           |
| `recent/{layer}/24h.csv.gz`, `48h.csv.gz` | The last 24 or 48 hours on the map, updated every hour                                                              |
| `grid/monthly/{year}/{month}.csv`         | Hotspots per 0.25 degree cell on the map, for longer periods                                                        |
| `meta/static_sources.csv`                 | Static heat sources, removed from the near real-time points as in the series                                        |
| `meta/validation.csv`                     | k, k20, error, correlation and confidence shown on the methodology page                                             |
| `meta/validation_monthly.csv`             | Observed S-NPP against MODIS × k, month by month from 2020 to 2024, for the validation chart                        |
| `series/.../yearly.csv`                   | The before and after chart on the methodology page                                                                  |

Every page checks `meta/latest.csv` once a minute, one check at a time. When the batch number grows, the site reads the lists in `meta/batches/` and reloads only the listed files that are on screen; the others leave the cache. It starts over, reading `meta/latest.csv` first and then every file on screen, when a list is missing, when more than 500 batches were skipped or when the number goes down. The status in the header turns into "Dados até" with the time of the last batch when it is more than 2 hours old.

Each series has one column per layer (`modis`, `viirs_snpp`, `viirs_noaa20`, `viirs_noaa21`, `landsat`) and a `harmonized` column, all but `landsat` with `_d` and `_n` versions for daytime and nighttime passes. Months and days are in UTC.

How `harmonized` is built:

- Every MODIS hotspot of type 0, at any confidence, is multiplied by the factor k of the 5 degree block where it fell. k is fitted on 2012 to 2019, and a block with fewer than 1,000 MODIS hotspots in those years uses the world k. Daytime and nighttime passes have their own k.
- VIIRS S-NPP is used as observed from 2012 until it stopped, on 2026-11-02.
- After that, VIIRS NOAA-20 is multiplied by k20, fitted against S-NPP on whole years from 2019 to 2025.
- A country total adds hotspots one by one, so it is not the sum of the grid cells around it.

## Pages

- `/calendar` picks the year, the continent and the country (`src/area-filters`).
- `/calendar/map?area={ISO3}&year={year}` shows the map, the reports and the fire calendar of that country; `area=world` shows the whole world. Each report opens its evidence (`src/report-evidence`): the chart behind the number, a CSV and a link to the month in the calendar.
- `/calendar/compare-dates?area={ISO3}&year={year}` compares two periods of the same length in one area: two maps on the same color scale, the totals against the typical for those dates, week by week and month by month (`src/compare-dates`).
- `/calendar/compare-regions?areas={ISO3},{ISO3}&year={year}` compares up to four countries in the same period, as total hotspots or per 1,000 km² of land, with the month by month calendar on one scale (`src/compare-regions`).
- `/anomalies?area={ISO3}` compares the last month with the typical one, lists the months that stand out and opens the calendar in anomaly mode (`src/anomalies`).
- `/methodology?area={ISO3}` explains the method, with the figures of `meta/validation.csv` for the chosen region (`src/methodology`). The confidence is high with 10,000 MODIS hotspots or more in the calibration years, medium from 1,000 to 9,999 and low below 1,000.

## Map

The code is in `src/fire-map`. The globe is drawn with MapLibre from the boundaries in `public/geo`, without map tiles.

- Periods up to 7 days show the hotspots of each day. Science points keep type 0 only, and near real-time points, which have no type, drop the ones whose position, cut to 0.01 degree, is in `meta/static_sources.csv`. This is the rule of the series, so the points of a day match `daily.csv`. Hotspots from the last 24 hours of the period are drawn as active fire.
- The count in the legend is the sum of the days of the period in `daily.csv`. Only the 24 and 48 hour windows, which do not fit whole days, count the points.
- Longer periods and the seasons show the monthly grid of the months they touch. A cell is kept when it touches the country, even if its center falls in the sea or in a neighbour, so no hotspot of the country is left out (on a small island such as Saint Lucia no cell center falls on land). At a land border a cell may also hold hotspots of the neighbour; the total in the legend does not change, because it is counted hotspot by hotspot in `daily.csv`.
- The latest 24 and 48 hour windows read `recent/`, and fall back to the daily points when it is missing.
- Each date uses the layer of the calendar: MODIS before 2012, then VIIRS S-NPP, then VIIRS NOAA-20.
- Seasons use whole months (December to February, March to May, June to August, September to November), named for the hemisphere of the country.

## Calendar

The code is in `src/fire-calendar`, and the file reading in `src/pipeline`.

- Rows are years from 2003, when Terra and Aqua were both observing, to the current year. The Source filter picks `harmonized`, raw MODIS or raw VIIRS (S-NPP for its whole months, NOAA-20 after), and the Passes filter picks the daytime or nighttime columns.
- A month is shown as a value, zero, no data, being calculated (raw count present but `harmonized` still empty), loading (outside the coverage of its layer) or future. The last month with data is marked partial, and months still built from near real-time data are marked preliminary.
- The typical month is the median of the same month over the years chosen in the Years filter, up to the last full year (2003 to the last full year by default). The fire season, the record year, the months that stand out and the month cards all use the same years and the chosen months. Colors use 6 classes on a log scale, with limits rounded to 1 or 3 times a power of 10.
- A month stands out when it is above the 90th percentile of the same month, at least twice the median and at least 20 hotspots.
- The fire season is the shortest run of consecutive months whose medians add up to 75% of a typical year.
- The current month is compared with the sum of the same days in earlier years, from day 1 to `complete_date`. While the pipeline does not publish `complete_date`, the day before the last day with data is used.
- The first report follows the period of the map (24 hours to a season): it sums the closed days of the period in `daily.csv` and compares them with the same days in each of the chosen years. The 24 and 48 hour windows are compared as whole UTC days.
- In anomaly mode, each month is divided by the median of the same month: below 0.5, 0.5 to 0.8, typical from 0.8 to 1.25, 1.25 to 2, 2 to 3 and above 3.
- Days after `complete_date` are marked as partial on the map and stay out of the comparisons.
