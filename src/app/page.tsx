import Link from "next/link";
import { regions } from "@/regions/region-catalog";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Fire Calendar</h1>
      <p className="mt-3 max-w-prose text-neutral-700 dark:text-neutral-300">
        Weekly burning activity from MODIS and VIIRS hot spots, harmonized into
        one record since 2003.
      </p>
      <h2 className="mt-8 text-lg font-semibold">Regions</h2>
      <ul className="mt-2 space-y-1">
        {regions.map((region) => (
          <li key={region.id}>
            <Link
              href={`/regions/${region.id}`}
              className="inline-flex min-h-11 items-center underline underline-offset-2"
            >
              {region.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
