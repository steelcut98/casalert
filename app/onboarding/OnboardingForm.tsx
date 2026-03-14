"use client";

import { useState, useEffect, useRef } from "react";
import { addPropertyWithBaselineScan, type OnboardingResult } from "./actions";
import { InspectionCategoryBadge } from "@/components/InspectionCategoryBadge";
import { PropertyQuestionnaire } from "@/components/onboarding/PropertyQuestionnaire";
import { propertyLimitLabel } from "@/lib/plans";
import Link from "next/link";

type PlanTier = "free" | "starter" | "pro";

export function OnboardingForm({
  canAddProperty,
  plan,
  currentCount,
  showUserQuestions,
}: {
  canAddProperty: boolean;
  plan: PlanTier;
  currentCount: number;
  showUserQuestions: boolean;
}) {
  const [citySlug, setCitySlug] = useState("chicago");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchDone, setAddressSearchDone] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (address.length < 3) {
      setAddressSuggestions([]);
      setAddressSearchDone(false);
      return;
    }
    const timer = setTimeout(async () => {
      setAddressSearchLoading(true);
      setAddressSearchDone(false);
      try {
        const res = await fetch(
          `/api/address-search?query=${encodeURIComponent(address)}&city=${encodeURIComponent(citySlug)}`
        );
        const data = (await res.json()) as { addresses?: string[] };
        setAddressSuggestions(data.addresses ?? []);
        setAddressSearchDone(true);
      } catch {
        setAddressSuggestions([]);
        setAddressSearchDone(true);
      } finally {
        setAddressSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [address, citySlug]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(e.target as Node)) {
        setAddressSuggestions([]);
        setAddressSearchDone(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setAddressSuggestions([]);
      setAddressSearchDone(false);
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
            <option value="philadelphia">Philadelphia</option>
          </select>
        </div>
        <div ref={addressDropdownRef} className="relative">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Property address
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 3223 N HARLEM AVE"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-8 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={loading || !canAddProperty}
              autoComplete="off"
            />
            {addressSearchLoading && (
              <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2" aria-hidden>
                <svg className="h-4 w-4 animate-spin text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            )}
          </div>
          {address.length >= 3 && (addressSearchLoading || addressSuggestions.length > 0 || addressSearchDone) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {addressSearchLoading && addressSuggestions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Searching…</p>
              ) : addressSuggestions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No matching addresses found.</p>
              ) : (
                <ul className="py-1">
                  {addressSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          setAddress(s);
                          setAddressSuggestions([]);
                          setAddressSearchDone(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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

          {result.propertyDetails &&
            (() => {
              const d = result.propertyDetails;
              const hasYear = d.year_built != null && d.year_built !== 0;
              const hasType = d.property_type != null && d.property_type !== "";
              const hasUnits = d.units != null && d.units !== 0;
              const hasSqft = d.square_footage != null && d.square_footage !== 0;
              const hasValue = d.assessed_value != null && d.assessed_value !== 0;
              const hasAny = hasYear || hasType || hasUnits || hasSqft || hasValue;
              if (!hasAny) return null;
              return (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Property profile
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {hasYear && (
                      <span>
                        <span className="text-zinc-500">Year built:</span>{" "}
                        <span className="text-zinc-100">{d.year_built}</span>
                      </span>
                    )}
                    {hasType && (
                      <span>
                        <span className="text-zinc-500">Property type:</span>{" "}
                        <span className="text-zinc-100">{d.property_type}</span>
                      </span>
                    )}
                    {hasUnits && (
                      <span>
                        <span className="text-zinc-500">Units:</span>{" "}
                        <span className="text-zinc-100">{d.units}</span>
                      </span>
                    )}
                    {hasSqft && (
                      <span>
                        <span className="text-zinc-500">Living area:</span>{" "}
                        <span className="text-zinc-100">
                          {d.square_footage!.toLocaleString()} sq ft
                        </span>
                      </span>
                    )}
                    {hasValue && (
                      <span>
                        <span className="text-zinc-500">Assessed value:</span>{" "}
                        <span className="text-zinc-100">
                          ${d.assessed_value!.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

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
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add another property
            </button>
          </div>

          <PropertyQuestionnaire
            propertyId={result.propertyId}
            showUserQuestions={showUserQuestions}
          />
        </div>
      )}
    </>
  );
}
