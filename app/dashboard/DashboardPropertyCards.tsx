"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeProperty } from "./actions";

type Property = {
  id: string;
  address: string;
  nickname: string | null;
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
  const router = useRouter();
  const [deleteModalProperty, setDeleteModalProperty] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          <div
            key={prop.id}
            className="relative rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteModalProperty(prop);
              }}
              className="absolute right-2 top-2 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              aria-label="Remove property"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <Link href={`/dashboard/${prop.id}`} className="block">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {prop.nickname ?? prop.address}
              </p>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                {city?.name ?? "—"}
              </span>
            </div>
            {prop.nickname && (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-500">
                {prop.address}
              </p>
            )}
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
          </div>
        );
      })}

      {/* Delete confirmation modal */}
      {deleteModalProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setDeleteModalProperty(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-2xl" aria-hidden="true">⚠️</p>
            <h2 id="delete-modal-title" className="mt-2 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Remove {deleteModalProperty.address}?
            </h2>
            <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
              This will permanently delete all violation data and reminders for this property. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => !deleting && setDeleteModalProperty(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleting) return;
                  setDeleting(true);
                  const r = await removeProperty(deleteModalProperty.id);
                  setDeleting(false);
                  setDeleteModalProperty(null);
                  if (!r.error) router.refresh();
                }}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70"
              >
                {deleting ? "Removing…" : "Remove property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
