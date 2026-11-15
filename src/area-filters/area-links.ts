export function areaFiltersHref(area: string | null, year: number | null) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (year) params.set("year", String(year));
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

<<<<<<< HEAD
export function compareDatesHref(area: string, year: number | null) {
  const params = new URLSearchParams({ area });
  if (year) params.set("year", String(year));
  return `/calendar/compare-dates?${params}`;
}

export function compareRegionsHref(areas: string[], year: number | null) {
  const params = new URLSearchParams({ areas: areas.join(",") });
  if (year) params.set("year", String(year));
  return `/calendar/compare-regions?${params}`;
}

=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
export function areaMapHref(area: string, year: number | null) {
  const params = new URLSearchParams({ area });
  if (year) params.set("year", String(year));
  return `/calendar/map?${params}`;
}
