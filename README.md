# Fire Calendar

A calendar of weekly burning activity for a region, built from the MODIS and VIIRS active fire detections in NASA FIRMS. The two sensors see fire at different resolutions, so their raw counts cannot be compared across the 2012 switch from MODIS to VIIRS. This project puts both records on the same scale, from 2003 to the present, and marks the typical fire season and the weeks that stand out from it.

The region is chosen with filters (country, state or biome) on a 3D globe, which also shows the active cells of the selected week.

Built for the NASA Space Apps Challenge 2026 challenge "Harmonization of MODIS and VIIRS Hot Spots".

## Data

- Active fire detections: NASA FIRMS, MODIS Collection 6.1 (Aqua) and VIIRS 375 m (Suomi NPP, NOAA-20), standard and near real-time products.
- Pantanal boundary: IBGE biome boundaries at 1:250,000.
- Punjab boundary: geoBoundaries, India ADM1, from DataMeet India (CC BY 2.5 IN).
- Base map: OpenFreeMap, with data from OpenStreetMap contributors.

We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).

## Running

Requires Node.js 24 or later.

```sh
npm install
npm run dev
```

Other scripts: `npm test`, `npm run lint`, `npm run build`, `npm run format`.

## Pipeline

The history is processed once, outside the site, and the site reads the result as static files.

1. Download the FIRMS archive for an area that covers every region in `src/regions/region-catalog.ts`, from 2003-01-01 to today, for MODIS C6.1, VIIRS S-NPP and VIIRS NOAA-20. Several downloads can be combined.
2. Place the CSV files in `data/raw/modis/` and `data/raw/viirs/`. This folder is not versioned.
3. Run `npm run build:calendars`, or `npm run build:calendars -- pantanal` for one region.

The script reads the files once, builds the active cells of the whole area, and then writes, for each region, `data/calendars/{regionId}.json`, the calendar the pages read, and `public/cells/{regionId}/{year}.json`, the active cells of each observed day for the map. A region without data in the download is reported and skipped.

| Region   | West  | South | East  | North |
| -------- | ----- | ----- | ----- | ----- |
| pantanal | -59.2 | -22.2 | -54.7 | -15.6 |
| punjab   | 73.8  | 29.5  | 77.0  | 32.6  |

How the calendar is built:

- Detections with low confidence are dropped. Terra is left out because it passes in the morning.
- Detections are placed on a global 0.05 degree grid. The daily measure is the number of active cells, so a fire that lights several 375 m VIIRS pixels counts once, as it does for the 1 km MODIS pixel. A region is the set of cells whose center lies inside its shape.
- Cells active on more than 10% of all days are treated as static heat sources and removed.
- MODIS Aqua is calibrated against VIIRS S-NPP over 2012 to 2021, by month and separately for daytime and nighttime passes. A month with too few cells uses the factor of the whole period, and a region with too few cells uses the factors of the whole downloaded area. The series uses S-NPP units: calibrated Aqua until 2012-01-19, S-NPP until 2026-11-01, and NOAA-20 calibrated against S-NPP over 2019 to 2025 after that.
- Each week is compared with the same week in every other year. The median is the expected value, weeks above the 90th percentile are anomalies, and the weeks whose median is in the top quarter form the fire season.

The code under `src/firms`, `src/harmonization` and `src/regions` also runs directly in Node, so those files import each other with relative paths that end in `.ts`.
