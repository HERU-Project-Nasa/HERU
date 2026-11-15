import type { SymbolName } from "@/icons/material-symbols";

export type Continent = { id: string; name: string; icon: SymbolName };

export const CONTINENTS: Continent[] = [
  { id: "North America", name: "América do Norte", icon: "public" },
  { id: "South America", name: "América do Sul", icon: "south_america" },
  { id: "Europe", name: "Europa", icon: "globe_uk" },
  { id: "Africa", name: "África", icon: "globe" },
  { id: "Asia", name: "Ásia", icon: "globe_asia" },
  { id: "Oceania", name: "Oceania", icon: "globe_asia" },
];

const ANTARCTICA: Continent = {
  id: "Antarctica",
  name: "Antártida",
  icon: "public",
};

export function findContinent(id: string | undefined): Continent | null {
  return (
    CONTINENTS.find((continent) => continent.id === id) ??
    (id === ANTARCTICA.id ? ANTARCTICA : null)
  );
}
