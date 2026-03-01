"use client";

import { useState } from "react";
import Link from "next/link";
import { InspectionCategoryBadge } from "@/components/InspectionCategoryBadge";

type DatasetType = "building" | "ordinance";

type BuildingViolation = {
  id?: string;
  address?: string;
  violation_date?: string;
  violation_code?: string;
  violation_description?: string;
  violation_status?: string;
  violation_status_date?: string;
  inspector_id?: string;
  inspection_number?: string;
  inspection_status?: string;
  inspection_category?: string;
  property_group?: string;
  [key: string]: unknown;
};

type OrdinanceViolation = {
  id?: string;
  docket_number?: string;
  address?: string;
  violation_code?: string;
  violation_description?: string;
  violation_date?: string;
  hearing_date?: string;
  case_disposition?: string;
  imposed_fine?: string;
  respondents?: string;
  [key: string]: unknown;
};

type ApiResponse =
  | {
      dataset: "building";
      address: string;
      total: number;
      data: BuildingViolation[];
    }
  | {
      dataset: "ordinance";
      address: string;
      total: number;
      data: OrdinanceViolation[];
    }
  | { error: string; status?: number; details?: string; message?: string };

const API_ENDPOINTS: Record<DatasetType, string> = {
  building: "/api/violations/chicago",
  ordinance: "/api/violations/chicago/ordinance",
};

export default function TestChicagoPage() {
  const [address, setAddress] = useState("");
  const [dataset, setDataset] = useState<DatasetType>("building");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const url = `${API_ENDPOINTS[dataset]}?address=${encodeURIComponent(address.trim())}`;
      const res = await fetch(url);
      const data: ApiResponse = await res.json();

      if (!res.ok) {
        setResult(data);
        return;
      }
      setResult(data);
    } catch (err) {
      setResult({
        error: "Request failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            CasAlert
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-500">
            Chicago API test
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Chicago violations API test
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Building Violations (22u3-xenr) are the primary dataset; Ordinance
          Violations (6br9-quuz) are violations that escalated to administrative
          hearings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dataset
            </label>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dataset"
                  value="building"
                  checked={dataset === "building"}
                  onChange={() => setDataset("building")}
                  className="rounded border-zinc-300"
                />
                <span className="text-sm">
                  Building Violations (22u3-xenr)
                  <span className="ml-1 text-zinc-500">— primary</span>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dataset"
                  value="ordinance"
                  checked={dataset === "ordinance"}
                  onChange={() => setDataset("ordinance")}
                  className="rounded border-zinc-300"
                />
                <span className="text-sm">
                  Ordinance Violations (6br9-quuz)
                  <span className="ml-1 text-zinc-500">— hearings</span>
                </span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 N STATE ST"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Fetching…" : "Fetch"}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-8">
            {"error" in result ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p className="font-medium text-red-800 dark:text-red-200">
                  {result.error}
                </p>
                {(result.details ?? result.message) && (
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {result.details ?? result.message}
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Found <strong>{result.total}</strong> violation
                  {result.total !== 1 ? "s" : ""} for &quot;{result.address}&quot;
                  {result.dataset === "building" && (
                    <span className="ml-2">
                      (Building Violations — inspection_category shown)
                    </span>
                  )}
                  {result.dataset === "ordinance" && (
                    <span className="ml-2">(Ordinance / hearings)</span>
                  )}
                </p>
                <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="max-h-[60vh] overflow-auto p-4">
                    {result.data.length === 0 ? (
                      <p className="text-zinc-500 dark:text-zinc-500">
                        No violations found.
                      </p>
                    ) : result.dataset === "building" ? (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="pb-2 pr-3 font-medium">
                              Inspection category
                            </th>
                            <th className="pb-2 pr-3 font-medium">Address</th>
                            <th className="pb-2 pr-3 font-medium">Date</th>
                            <th className="pb-2 pr-3 font-medium">Code</th>
                            <th className="pb-2 pr-3 font-medium">Status</th>
                            <th className="max-w-[220px] pb-2 font-medium">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.data as BuildingViolation[]).map((row, i) => (
                            <tr
                              key={row.id ?? i}
                              className="border-b border-zinc-100 dark:border-zinc-800"
                            >
                              <td className="py-2 pr-3">
                                <InspectionCategoryBadge
                                  category={row.inspection_category}
                                />
                              </td>
                              <td className="py-2 pr-3">{row.address ?? "—"}</td>
                              <td className="py-2 pr-3">
                                {row.violation_date
                                  ? new Date(
                                      row.violation_date
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3">
                                {row.violation_code ?? "—"}
                              </td>
                              <td className="py-2 pr-3">
                                {row.violation_status ?? "—"}
                              </td>
                              <td className="max-w-[220px] truncate py-2">
                                {row.violation_description ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="pb-2 pr-4 font-medium">Address</th>
                            <th className="pb-2 pr-4 font-medium">Docket</th>
                            <th className="pb-2 pr-4 font-medium">Code</th>
                            <th className="pb-2 pr-4 font-medium">Description</th>
                            <th className="pb-2 pr-4 font-medium">Date</th>
                            <th className="pb-2 font-medium">Disposition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.data as OrdinanceViolation[]).map(
                            (row, i) => (
                              <tr
                                key={row.id ?? i}
                                className="border-b border-zinc-100 dark:border-zinc-800"
                              >
                                <td className="py-2 pr-4">
                                  {row.address ?? "—"}
                                </td>
                                <td className="py-2 pr-4">
                                  {row.docket_number ?? "—"}
                                </td>
                                <td className="py-2 pr-4">
                                  {row.violation_code ?? "—"}
                                </td>
                                <td className="max-w-[200px] truncate py-2 pr-4">
                                  {row.violation_description ?? "—"}
                                </td>
                                <td className="py-2 pr-4">
                                  {row.violation_date
                                    ? new Date(
                                        row.violation_date
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="py-2">
                                  {row.case_disposition ?? "—"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Raw JSON
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
