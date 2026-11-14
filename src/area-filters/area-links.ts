export function areaFiltersHref(area: string | null, year: number | null) {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (year) params.set("year", String(year));
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

export function areaMapHref(area: string, year: number | null) {
  const params = new URLSearchParams({ area });
  if (year) params.set("year", String(year));
  return `/calendar/map?${params}`;
}
