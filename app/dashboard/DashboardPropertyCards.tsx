"use client";

import Link from "next/link";

type Property = {
  id: string;
  address: string;
  city_id: string;
  last_scanned_at: string | null;
  property_group: string | null;
};
type City = { id: string; name: string; slug: string };

export function DashboardPropertyCards({
  properties,
  cityMap,
  violationsByProperty,
}: {
  properties: Property[];
  cityMap: Map<string, City>;
  violationsByProperty: Record<
    string,
    { open: number; complaint: number; byCategory: Record<string, number> }
  >;
}) {
  if (properties.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">
          No properties yet. Add your first property to start monitoring
          violations.
        </p>
        <Link
          href="/onboarding"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add property
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {properties.map((prop) => {
        const city = cityMap.get(prop.city_id);
        const stats = violationsByProperty[prop.id] ?? {
          open: 0,
          complaint: 0,
          byCategory: {},
        };
        const statusColor =
          stats.open === 0
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            : stats.open <= 2
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200";
        return (
          <Link
            key={prop.id}
            href={`/dashboard/${prop.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {prop.address}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-500">
              {city?.name ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusColor}`}
              >
                {stats.open} open
              </span>
              {stats.complaint > 0 && (
                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200">
                  {stats.complaint} COMPLAINT
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {(() => {
                const scannedAt = prop.last_scanned_at
                  ? new Date(prop.last_scanned_at).getTime()
                  : null;
                const now = Date.now();
                const hoursAgo = scannedAt
                  ? (now - scannedAt) / (1000 * 60 * 60)
                  : Infinity;
                const freshness =
                  hoursAgo <= 1
                    ? "up-to-date"
                    : hoursAgo <= 6
                      ? "recent"
                      : "pending";
                return (
                  <>
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 font-medium ${
                        freshness === "up-to-date"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : freshness === "recent"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {freshness === "up-to-date"
                        ? "Up to date"
                        : freshness === "recent"
                          ? "Recent"
                          : "Pending scan"}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-500">
                      Last scanned:{" "}
                      {prop.last_scanned_at
                        ? new Date(prop.last_scanned_at).toLocaleString()
                        : "Never"}
                    </span>
                  </>
                );
              })()}
            </div>
            {Object.keys(stats.byCategory).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(stats.byCategory).map(([cat, n]) => (
                  <span
                    key={cat}
                    className={
                      cat.toUpperCase() === "COMPLAINT"
                        ? "rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200"
                        : "rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    }
                  >
                    {cat} {n}
                  </span>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
