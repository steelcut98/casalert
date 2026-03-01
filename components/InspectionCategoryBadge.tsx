/**
 * Badge for inspection_category. COMPLAINT = tenant-filed 311 (highest risk)
 * is styled as urgent. Used on test page and dashboard.
 */
export type InspectionCategory =
  | "COMPLAINT"
  | "PERIODIC"
  | "PERMIT"
  | "REGISTRATION"
  | string;

export function InspectionCategoryBadge({
  category,
  className = "",
}: {
  category: InspectionCategory | null | undefined;
  className?: string;
}) {
  const value = category ?? "—";
  const isComplaint = value.toUpperCase() === "COMPLAINT";

  return (
    <span
      className={
        isComplaint
          ? `inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200 ${className}`
          : `inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 ${className}`
      }
      title={
        isComplaint
          ? "Tenant-filed 311 complaint — highest priority"
          : value === "PERIODIC"
            ? "Routine inspection"
            : value === "PERMIT"
              ? "Permit-related"
              : value === "REGISTRATION"
                ? "Registration inspection"
                : undefined
      }
    >
      {value}
      {isComplaint && (
        <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden>
          ●
        </span>
      )}
    </span>
  );
}
