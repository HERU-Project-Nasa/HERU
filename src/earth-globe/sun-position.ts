export type GeographicPoint = { latitude: number; longitude: number };

const J2000_NOON = Date.UTC(2000, 0, 1, 12);
const DAY_IN_MILLISECONDS = 86_400_000;
const RADIANS_PER_DEGREE = Math.PI / 180;

export function subsolarPoint(date: Date): GeographicPoint {
  const days = (date.getTime() - J2000_NOON) / DAY_IN_MILLISECONDS;
  const meanLongitude = 280.46 + 0.9856474 * days;
  const meanAnomaly = (357.528 + 0.9856003 * days) * RADIANS_PER_DEGREE;
  const eclipticLongitude =
    (meanLongitude +
      1.915 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly)) *
    RADIANS_PER_DEGREE;
  const obliquity = (23.439 - 0.0000004 * days) * RADIANS_PER_DEGREE;
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const siderealTime = 280.46061837 + 360.98564736629 * days;
  return {
    latitude: declination / RADIANS_PER_DEGREE,
    longitude: wrapLongitude(
      rightAscension / RADIANS_PER_DEGREE - siderealTime,
    ),
  };
}

function wrapLongitude(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}
