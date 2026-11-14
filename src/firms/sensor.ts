export type Instrument = "modis" | "viirs";

export type Sensor =
  "modis-terra" | "modis-aqua" | "viirs-snpp" | "viirs-noaa20" | "viirs-noaa21";

export const sensorNames: Record<Sensor, string> = {
  "modis-terra": "MODIS Terra",
  "modis-aqua": "MODIS Aqua",
  "viirs-snpp": "VIIRS Suomi NPP",
  "viirs-noaa20": "VIIRS NOAA-20",
  "viirs-noaa21": "VIIRS NOAA-21",
};
