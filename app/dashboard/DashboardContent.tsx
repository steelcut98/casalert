"use client";

import { useState, useMemo } from "react";
import { DashboardPropertyCards } from "./DashboardPropertyCards";

type Property = {
  id: string;
  address: string;
  nickname: string | null;
  city_id: string;
  last_scanned_at: string | null;
  property_group: string | null;
};
type City = { id: string; name: string; slug: string };

export function DashboardContent({
  properties,
  cityMap,
  violationsByProperty,
  cities,
}: {
  properties: Property[];
  cityMap: Map<string, City>;
  violationsByProperty: Record<
    string,
    { open: number; complaint: number; byCategory: Record<string, number> }
  >;
  cities: City[];
}) {
  const [cityFilter, setCityFilter] = useState<string>("");

  const filteredAndSorted = useMemo(() => {
    let list = properties;
    if (cityFilter) {
      const cityId = cities.find((c) => c.slug === cityFilter)?.id;
      if (cityId) list = properties.filter((p) => p.city_id === cityId);
    }
    return [...list].sort((a, b) => {
      const openA = violationsByProperty[a.id]?.open ?? 0;
      const openB = violationsByProperty[b.id]?.open ?? 0;
      return openB - openA;
    });
  }, [properties, cityFilter, cities, violationsByProperty]);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Cities:</span>
        <button
          type="button"
          onClick={() => setCityFilter("")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            cityFilter === ""
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-500"
          }`}
        >
          All cities
        </button>
        {cities.map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => setCityFilter(city.slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              cityFilter === city.slug
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-500"
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>
      <DashboardPropertyCards
        properties={filteredAndSorted}
        cityMap={cityMap}
        violationsByProperty={violationsByProperty}
      />
    </>
  );
}
