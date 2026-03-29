"use client";

import { useState, useMemo } from "react";
import { DashboardPropertyCards } from "./DashboardPropertyCards";
import { useAnalytics } from "@/lib/useAnalytics";

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
  portfolioStats,
  newViolationsByProperty = {},
  overdueByProperty = {},
  resolutionsByProperty = {},
  scoresByProperty = {},
}: {
  properties: Property[];
  cityMap: Map<string, City>;
  violationsByProperty: Record<
    string,
    { open: number; complaint: number; byCategory: Record<string, number> }
  >;
  cities: City[];
  newViolationsByProperty?: Record<string, number>;
  overdueByProperty?: Record<string, number>;
  resolutionsByProperty?: Record<string, { resolved: number; pendingVerification: number; spendMin: number; spendMax: number }>;
  scoresByProperty?: Record<string, { score: number; grade: string; gradeColor: string }>;
  portfolioStats?: {
    totalProperties: number;
    totalOpenViolations: number;
    totalComplaints: number;
    totalPendingVerification: number;
    totalResolved: number;
    totalSpendMin: number;
    totalSpendMax: number;
  };
}) {
  const [cityFilter, setCityFilter] = useState<string>("");
  useAnalytics();

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

  const filteredPortfolioStats = useMemo(() => {
    if (!portfolioStats) return null;

    const cityId = cityFilter ? cities.find((c) => c.slug === cityFilter)?.id : null;
    const filteredProps = cityId
      ? properties.filter((p) => p.city_id === cityId)
      : properties;
    const filteredPropertyIds = new Set(filteredProps.map((p) => p.id));

    let totalOpenViolations = 0;
    let totalComplaints = 0;
    let totalPendingVerification = 0;
    let totalResolved = 0;
    let totalSpendMin = 0;
    let totalSpendMax = 0;

    for (const propId of filteredPropertyIds) {
      const vStats = violationsByProperty[propId];
      if (vStats) {
        totalOpenViolations += vStats.open;
        totalComplaints += vStats.complaint;
      }
      const rStats = resolutionsByProperty[propId];
      if (rStats) {
        totalPendingVerification += rStats.pendingVerification;
        totalResolved += rStats.resolved;
        totalSpendMin += rStats.spendMin;
        totalSpendMax += rStats.spendMax;
      }
    }

    return {
      totalProperties: filteredProps.length,
      totalOpenViolations,
      totalComplaints,
      totalPendingVerification,
      totalResolved,
      totalSpendMin,
      totalSpendMax,
    };
  }, [cityFilter, cities, properties, violationsByProperty, resolutionsByProperty, portfolioStats]);

  return (
    <>
      {filteredPortfolioStats && filteredPortfolioStats.totalProperties > 0 && (
        <div className="mt-6 mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Portfolio Overview{cityFilter ? ` — ${cities.find(c => c.slug === cityFilter)?.name ?? cityFilter}` : ""}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{filteredPortfolioStats.totalProperties}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Properties</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${filteredPortfolioStats.totalOpenViolations > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {filteredPortfolioStats.totalOpenViolations}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Open violations</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${filteredPortfolioStats.totalComplaints > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}>
                {filteredPortfolioStats.totalComplaints}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Complaints</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${filteredPortfolioStats.totalPendingVerification > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}>
                {filteredPortfolioStats.totalPendingVerification}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending verification</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{filteredPortfolioStats.totalResolved}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Resolved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {filteredPortfolioStats.totalSpendMax > 0
                  ? filteredPortfolioStats.totalSpendMin === filteredPortfolioStats.totalSpendMax
                    ? `$${filteredPortfolioStats.totalSpendMin.toLocaleString()}`
                    : `$${filteredPortfolioStats.totalSpendMin.toLocaleString()}-$${filteredPortfolioStats.totalSpendMax.toLocaleString()}`
                  : "$0"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total spent</p>
            </div>
          </div>
        </div>
      )}
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
        newViolationsByProperty={newViolationsByProperty}
        overdueByProperty={overdueByProperty}
        scoresByProperty={scoresByProperty}
      />
    </>
  );
}
