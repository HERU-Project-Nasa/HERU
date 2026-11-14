# HERU

A monthly calendar of fire hotspots for every country and for the whole world, built from the MODIS and VIIRS active fire detections in NASA FIRMS. The two sensors see fire at different resolutions, so their raw counts cannot be compared across the 2012 switch from MODIS to VIIRS. HERU puts both records on the same scale, from 2003 to the present, and marks the typical fire season and the months that stand out from it.

Built for the NASA Space Apps Challenge 2026 challenge "Harmonization of MODIS and VIIRS Hot Spots".

## Data

- Active fire detections: NASA FIRMS, MODIS Collection 6.1 (Terra and Aqua) and VIIRS 375 m (Suomi NPP, NOAA-20), standard and near real-time products.
- Country boundaries in `public/geo`: Natural Earth 1:50m Admin 0 countries, version 5.1.2 (public domain), reduced to the country code and outline, with coordinates rounded to 0.01 degree. The country areas shown on the filter page are computed from these outlines and are approximate.
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

## Pipeline files

The pipeline publishes small CSV files that the site reads as they are. The calendar uses:

| File                                     | Use                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `meta/latest.csv`                        | Number of the last batch, checked every 5 minutes                     |
| `meta/batches/{batch}.csv`               | Files changed by a batch, so only those are read again                |
| `meta/coverage.csv`                      | First and last day of each layer, which separates "not loaded" from 0 |
| `meta/countries.csv`                     | Countries in the region filter                                        |
| `series/countries/{ISO3}/monthly.csv`    | The calendar of a country                                             |
| `series/countries/{ISO3}/daily.csv`      | The current month against the same days of earlier years              |
| `series/global/monthly.csv`, `daily.csv` | The same for the whole world                                          |
| `series/countries/{ISO3}/yearly.csv`     | Hotspots of the chosen year on the filter page                        |
| `points/{layer}/{year}/{date}.csv.gz`    | Hotspots of each day on the map, for periods up to 7 days             |
| `grid/monthly/{year}/{month}.csv`        | Hotspots per 0.25 degree cell on the map, for longer periods          |
| `meta/static_sources.csv`                | Static heat sources, removed from the VIIRS points as in the series   |

Each series has one column per layer (`modis`, `viirs_snpp`, `viirs_noaa20`) and a `harmonized` column, all with `_d` and `_n` versions for daytime and nighttime passes. Months and days are in UTC.

How `harmonized` is built:

- Every MODIS hotspot of type 0, at any confidence, is multiplied by the factor k of the 5 degree block where it fell. k is fitted on 2012 to 2019.
- VIIRS S-NPP is used as observed from 2012 until it stopped, on 2026-11-02.
- After that, VIIRS NOAA-20 is multiplied by k20, fitted against S-NPP on whole years from 2019 to 2025.
- A country total adds hotspots one by one, so it is not the sum of the grid cells around it.

## Pages

- `/calendar` picks the year, the continent and the country (`src/area-filters`).
- `/calendar/map?area={ISO3}&year={year}` shows the map, the reports and the fire calendar of that country; `area=world` shows the whole world.

## Map

The code is in `src/fire-map`. The globe is drawn with MapLibre from the boundaries in `public/geo`, without map tiles.

- Periods up to 7 days show the hotspots of each day. MODIS keeps type 0 only, and VIIRS drops the points whose position, cut to 0.01 degree, is in `meta/static_sources.csv`, so the count matches the `daily.csv` series. Hotspots from the last 24 hours of the period are drawn as active fire.
- Longer periods and the seasons show the monthly grid of the months they touch, keeping the cells whose center is inside the country. The count in the legend is the sum of the days of the period in `daily.csv`.
- Each date uses the layer of the calendar: MODIS before 2012, then VIIRS S-NPP, then VIIRS NOAA-20.
- Seasons use whole months (December to February, March to May, June to August, September to November), named for the hemisphere of the country.

## Calendar

The code is in `src/fire-calendar`, and the file reading in `src/pipeline`.

- Rows are years from 2003, when Terra and Aqua were both observing, to the current year. The Source filter picks `harmonized`, raw MODIS or raw VIIRS (S-NPP for its whole months, NOAA-20 after), and the Passes filter picks the daytime or nighttime columns.
- A month is shown as a value, zero, no data, being calculated (raw count present but `harmonized` still empty), loading (outside the coverage of its layer) or future. The last month with data is marked partial, and months still built from near real-time data are marked preliminary.
- The typical month is the median of the same month from 2003 to the last full year. Colors use 6 classes on a log scale, with limits rounded to 1 or 3 times a power of 10.
- A month stands out when it is above the 90th percentile of the same month, at least twice the median and at least 20 hotspots.
- The fire season is the shortest run of consecutive months whose medians add up to 75% of a typical year.
- The current month is compared with the sum of the same days in earlier years.
