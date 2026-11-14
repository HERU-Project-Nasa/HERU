import type { Sensor } from "./sensor.ts";

export type Detection = {
  sensor: Sensor;
  latitude: number;
  longitude: number;
  acquiredAt: string;
  confidence: "low" | "nominal" | "high";
  radiativePower: number;
  daytime: boolean;
};
