import { InspectionCategoryBadge } from "@/components/InspectionCategoryBadge";

export type ViolationRow = {
  id?: string;
  address?: string;
  violation_date?: string;
  violation_code?: string;
  violation_description?: string;
  violation_status?: string;
  inspection_category?: string | null;
  [key: string]: unknown;
};

/**
 * Table used on the dashboard to show violations with inspection_category
 * prominent (first column). COMPLAINT violations are styled as highest urgency.
 */
export function ViolationsTable({
  violations,
  emptyMessage = "No violations. Add properties and run a scan to see results here.",
}: {
  violations: ViolationRow[];
  emptyMessage?: string;
}) {
  if (violations.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-500">{emptyMessage}</p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
          COMPLAINT = tenant-filed 311 (highest priority); PERIODIC = routine;
          PERMIT / REGISTRATION = permit or registration inspection.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Inspection category
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Address
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Date
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Code
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {violations.map((row, i) => (
              <tr
                key={row.id ?? i}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-3">
                  <InspectionCategoryBadge
                    category={row.inspection_category}
                  />
                </td>
                <td className="px-4 py-3">{row.address ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.violation_date
                    ? new Date(row.violation_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">{row.violation_code ?? "—"}</td>
                <td className="px-4 py-3">{row.violation_status ?? "—"}</td>
                <td className="max-w-[240px] truncate px-4 py-3">
                  {row.violation_description ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
