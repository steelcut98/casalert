"use client";

import { useState } from "react";
import { addPropertyWithBaselineScan, type OnboardingResult } from "./actions";
import { InspectionCategoryBadge } from "@/components/InspectionCategoryBadge";
import { propertyLimitLabel } from "@/lib/plans";
import Link from "next/link";

type PlanTier = "free" | "starter" | "pro";

export function OnboardingForm({
  canAddProperty,
  plan,
  currentCount,
}: {
  canAddProperty: boolean;
  plan: PlanTier;
  currentCount: number;
}) {
  const [citySlug, setCitySlug] = useState("chicago");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !canAddProperty) return;
    setLoading(true);
    setResult(null);
    const res = await addPropertyWithBaselineScan(citySlug, address.trim());
    setResult(res);
    setLoading(false);
    if (res.success) {
      setAddress("");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            City
          </label>
          <select
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="chicago">Chicago</option>
            <option value="philadelphia" disabled>
              Philadelphia (coming soon)
            </option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Property address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 3223 N HARLEM AVE"
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            disabled={loading || !canAddProperty}
          />
        </div>
        {!canAddProperty && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Property limit reached
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Your plan allows {propertyLimitLabel(plan)}{" "}
              {propertyLimitLabel(plan) === "1" ? "property" : "properties"}.
              Upgrade to add more.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm font-medium text-amber-800 underline dark:text-amber-200"
            >
              Back to dashboard
            </Link>
          </div>
        )}
        {canAddProperty && (
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Validating & scanning…" : "Validate and add property"}
          </button>
        )}
      </form>

      {result && !result.success && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-200">
            {result.error}
          </p>
          {result.error.includes("Upgrade") && (
            <Link
              href="/dashboard"
              className="mt-2 inline-block text-sm text-red-700 underline dark:text-red-300"
            >
              Back to dashboard
            </Link>
          )}
        </div>
      )}

      {result && result.success && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Property report
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {result.address} · {result.cityName}
            {result.propertyGroup && (
              <span className="ml-2 text-zinc-500">
                (property group: {result.propertyGroup})
              </span>
            )}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {result.totalViolations}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Total violations
              </p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                {result.openCount}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Open</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
                {result.closedCount}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Closed</p>
            </div>
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Most recent
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {result.mostRecentDate
                  ? new Date(result.mostRecentDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              By inspection category
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(result.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <span
                    key={cat}
                    className={
                      cat.toUpperCase() === "COMPLAINT"
                        ? "inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-sm font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200"
                        : "inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-sm text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    }
                  >
                    <InspectionCategoryBadge category={cat} />
                    <span>{count}</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              All violations (newest first)
            </p>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {result.violations.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-zinc-100 dark:border-zinc-700"
                    >
                      <td className="px-3 py-2">
                        <InspectionCategoryBadge
                          category={v.inspection_category}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {v.violation_date
                          ? new Date(v.violation_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{v.violation_code ?? "—"}</td>
                      <td className="px-3 py-2">{v.violation_status ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-3 py-2">
                        {v.violation_description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to dashboard
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add another property
            </button>
          </div>
        </div>
      )}
    </>
  );
}
