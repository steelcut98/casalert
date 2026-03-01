"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { InspectionCategoryBadge } from "@/components/InspectionCategoryBadge";
import {
  setViolationReminder,
  clearViolationReminder,
  setBulkViolationReminders,
  rescanPropertyViolations,
  type ReminderFrequency,
} from "./actions";

const DATA_PREVIEW_BASE =
  "https://data.cityofchicago.org/Buildings/Building-Violations/22u3-xenr/data_preview";
const BUILDING_RECORDS_URL = "https://webapps1.chicago.gov/buildingrecords/";

const POPOVER_GUIDANCE_TEXT =
  "Building code violations can result in fines starting at $1,000–$2,000 per violation per day, but can escalate significantly for repeat offenders — including placement on the Problem Landlord List, permit ineligibility, property liens, and in severe cases, building forfeiture. This applies to all violation types (COMPLAINT, PERIODIC, PERMIT, REGISTRATION). COMPLAINT violations carry the highest risk as they indicate someone actively reported a problem. Always refer to your official violation notice for specific deadlines. This is general information, not legal advice.";

const REMINDER_FREQUENCY_LABELS: Record<string, string> = {
  every_3_days: "every 3 days",
  every_week: "every week",
  "10_days_before": "10 days before",
  "3_days_before": "3 days before",
  "1_day_before": "1 day before",
};

const REMINDER_FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: "every_3_days", label: "Every 3 days" },
  { value: "every_week", label: "Every week" },
  { value: "10_days_before", label: "10 days before deadline" },
  { value: "3_days_before", label: "3 days before deadline" },
  { value: "1_day_before", label: "1 day before deadline" },
];

type ViolationRow = {
  id: string;
  violation_date: string | null;
  violation_code: string | null;
  violation_description: string | null;
  violation_status: string | null;
  violation_status_date: string | null;
  violation_inspector_comments: string | null;
  violation_ordinance: string | null;
  inspector_id: string | null;
  inspection_category: string | null;
  address: string | null;
};

type ReminderInfo = {
  deadline_date: string;
  reminder_frequency: string;
  next_reminder_at: string | null;
};

type Filter = "all" | "open" | "complaints";

function daysUntil(deadlineStr: string): number {
  const d = new Date(deadlineStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function PropertyDetailClient({
  propertyId,
  violations,
  violationsQueryError,
  canExportCsv,
  propertyAddress,
  propertyGroup,
  remindersByViolation,
}: {
  propertyId: string;
  violations: ViolationRow[];
  violationsQueryError: string | null;
  canExportCsv: boolean;
  propertyAddress: string;
  propertyGroup: string | null;
  remindersByViolation: Record<string, ReminderInfo>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [infoPopoverAnchor, setInfoPopoverAnchor] = useState<"section" | string | null>(null);
  const infoPopoverRef = useRef<HTMLDivElement>(null);
  const [reminderFormViolationId, setReminderFormViolationId] = useState<string | null>(null);
  const [reminderDeadline, setReminderDeadline] = useState("");
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("3_days_before");
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [bulkReminderOn, setBulkReminderOn] = useState(false);
  const [bulkDeadline, setBulkDeadline] = useState("");
  const [bulkFrequency, setBulkFrequency] = useState<ReminderFrequency>("3_days_before");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkConfirmOverride, setBulkConfirmOverride] = useState(false);

  useEffect(() => {
    if (!infoPopoverAnchor) return;
    function handleClick(e: MouseEvent) {
      if (infoPopoverRef.current && !infoPopoverRef.current.contains(e.target as Node)) {
        setInfoPopoverAnchor(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [infoPopoverAnchor]);

  const isOpen = (v: ViolationRow) =>
    (v.violation_status ?? "").toUpperCase() === "OPEN";
  const openViolations = useMemo(
    () => violations.filter(isOpen),
    [violations]
  );
  const historicalViolations = useMemo(
    () => violations.filter((v) => !isOpen(v)),
    [violations]
  );

  const allOpenHaveReminders =
    openViolations.length > 0 &&
    openViolations.every((v) => remindersByViolation[v.id]);

  // Checkbox stays checked only when all open violations share the exact same reminder
  const allOpenHaveSameReminder =
    openViolations.length > 0 &&
    allOpenHaveReminders &&
    (() => {
      const first = remindersByViolation[openViolations[0].id];
      if (!first) return false;
      return openViolations.every(
        (v) => {
          const r = remindersByViolation[v.id];
          return r && r.deadline_date === first.deadline_date && r.reminder_frequency === first.reminder_frequency;
        }
      );
    })();

  const filteredOpen =
    filter === "complaints"
      ? openViolations.filter(
          (v) => (v.inspection_category ?? "").toUpperCase() === "COMPLAINT"
        )
      : openViolations;
  const filteredHistorical =
    filter === "all" ? historicalViolations : [];

  const totalOpen = openViolations.length;
  const totalClosed = historicalViolations.length;
  const total = violations.length;
  const complianceRate =
    total > 0 ? Math.round((totalClosed / total) * 100) : 0;
  const firstDate = violations.length
    ? violations.reduce(
        (min, v) => {
          const d = v.violation_date ? new Date(v.violation_date).getTime() : 0;
          return d && (min === null || d < min) ? d : min;
        },
        null as number | null
      )
    : null;
  const mostRecentDate = violations.length
    ? violations.reduce(
        (max, v) => {
          const d = v.violation_date ? new Date(v.violation_date).getTime() : 0;
          return d > (max ?? 0) ? d : max;
        },
        null as number | null
      )
    : null;

  const filteredForExport = useMemo(() => {
    if (filter === "all") return violations;
    if (filter === "open") return openViolations;
    return openViolations.filter(
      (v) => (v.inspection_category ?? "").toUpperCase() === "COMPLAINT"
    );
  }, [violations, filter, openViolations]);

  // Pre-fill bulk form when all open violations share the same reminder (Edit all).
  // Must be declared after openViolations useMemo to avoid ReferenceError.
  useEffect(() => {
    if (!bulkReminderOn || openViolations.length === 0) return;
    const reminders = openViolations
      .map((v) => remindersByViolation[v.id])
      .filter(Boolean) as ReminderInfo[];
    if (reminders.length !== openViolations.length) return;
    const first = reminders[0];
    const same = reminders.every(
      (r) => r.deadline_date === first.deadline_date && r.reminder_frequency === first.reminder_frequency
    );
    if (same) {
      setBulkDeadline(first.deadline_date);
      setBulkFrequency(first.reminder_frequency as ReminderFrequency);
    }
  }, [bulkReminderOn, openViolations, remindersByViolation]);

  function downloadCsv() {
    const headers = [
      "Inspection Category",
      "Date",
      "Code",
      "Status",
      "Description",
      "Address",
      "Inspector comments",
      "Ordinance",
    ];
    const escape = (s: string) =>
      /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const rows = filteredForExport.map((v) =>
      [
        v.inspection_category ?? "",
        v.violation_date
          ? new Date(v.violation_date).toLocaleDateString()
          : "",
        v.violation_code ?? "",
        v.violation_status ?? "",
        v.violation_description ?? "",
        v.address ?? "",
        v.violation_inspector_comments ?? "",
        v.violation_ordinance ?? "",
      ].map((x) => escape(String(x ?? ""))).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `violations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitReminder(violationId: string) {
    setReminderError(null);
    setReminderSubmitting(true);
    const err = await setViolationReminder(
      violationId,
      propertyId,
      reminderDeadline,
      reminderFrequency
    );
    setReminderSubmitting(false);
    if (err.error) {
      setReminderError(err.error);
      return;
    }
    setReminderFormViolationId(null);
    setReminderDeadline("");
    setBulkReminderOn(false); // individual reminder changed → no longer "all same"
    window.location.reload(); // refresh so checkbox and list reflect new reminder state
  }

  function renderRow(v: ViolationRow, isOpenSection: boolean) {
    const open = isOpen(v);
    const isDifferentAddress =
      propertyGroup &&
      v.address &&
      v.address.trim().toUpperCase() !== propertyAddress.trim().toUpperCase();
    const isExpanded = expandedId === v.id;
    const reminder = remindersByViolation[v.id];
    const daysLeft = reminder ? daysUntil(reminder.deadline_date) : null;
    const countdownColor =
      daysLeft === null
        ? ""
        : daysLeft > 14
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : daysLeft >= 7
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200";
    const showReminderForm = reminderFormViolationId === v.id;

    return (
      <div
        key={v.id}
        className={`border-l-4 ${
          open
            ? openViolations.length <= 2
              ? "border-amber-500"
              : "border-red-500"
            : "border-zinc-300 dark:border-zinc-600"
        } bg-white dark:bg-zinc-900`}
      >
        <div
          className="flex cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          onClick={() => setExpandedId(isExpanded ? null : v.id)}
        >
          <span
            className="mt-0.5 shrink-0 text-zinc-400"
            aria-hidden
          >
            {isExpanded ? "▼" : "▶"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <InspectionCategoryBadge category={v.inspection_category} />
              <div className="relative inline-flex" ref={infoPopoverAnchor === v.id ? infoPopoverRef : undefined}>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-500"
                  title="Violation process & fines"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoPopoverAnchor(infoPopoverAnchor === v.id ? null : v.id);
                  }}
                  aria-label="Show guidance"
                >
                  <span className="text-xs font-semibold">i</span>
                </button>
                {infoPopoverAnchor === v.id && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{POPOVER_GUIDANCE_TEXT}</p>
                  </div>
                )}
              </div>
              {isDifferentAddress && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  Different address (same building)
                </span>
              )}
              {open && reminder && daysLeft !== null && (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${countdownColor}`}
                  title={`Deadline: ${reminder.deadline_date}`}
                >
                  {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Due today" : "Overdue"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {v.violation_date
                ? new Date(v.violation_date).toLocaleDateString()
                : "—"}{" "}
              · {v.violation_code ?? "—"} · {v.violation_status ?? "—"}
            </p>
            <p className="mt-0.5 max-w-xl truncate text-sm text-zinc-700 dark:text-zinc-300">
              {v.violation_description ?? "—"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {open && (
              <>
                {reminder ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    Deadline: {new Date(reminder.deadline_date).toLocaleDateString()}
                    {REMINDER_FREQUENCY_LABELS[reminder.reminder_frequency] && (
                      <> · Reminder: {REMINDER_FREQUENCY_LABELS[reminder.reminder_frequency]}</>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No reminder set
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReminderFormViolationId(v.id);
                    setReminderError(null);
                    if (reminder) {
                      setReminderDeadline(reminder.deadline_date);
                      setReminderFrequency(reminder.reminder_frequency as ReminderFrequency);
                    } else {
                      setReminderDeadline("");
                      setReminderFrequency("3_days_before");
                    }
                  }}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {reminder ? "Edit reminder" : "Set reminder"}
                </button>
              </>
            )}
            <a
              href={`${DATA_PREVIEW_BASE}?column=address&value=${encodeURIComponent(v.address ?? propertyAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              City data
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href={BUILDING_RECORDS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Building Records
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
        {showReminderForm && open && (
          <div
            className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {reminder ? "Edit deadline reminder" : "Set deadline reminder"}
            </p>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-500">
              Deadlines are entered by you based on your official notice. CasAlert does not determine compliance deadlines.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Your compliance deadline (from notice)
                </label>
                <input
                  type="date"
                  value={reminderDeadline}
                  onChange={(e) => setReminderDeadline(e.target.value)}
                  className="mt-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Remind me
                </label>
                <select
                  value={reminderFrequency}
                  onChange={(e) => setReminderFrequency(e.target.value as ReminderFrequency)}
                  className="mt-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {REMINDER_FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={reminderSubmitting || !reminderDeadline}
                onClick={() => submitReminder(v.id)}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {reminderSubmitting ? "Saving…" : "Save"}
              </button>
              {reminder && (
                <button
                  type="button"
                  onClick={async () => {
                    const err = await clearViolationReminder(v.id, propertyId);
                    if (!err.error) {
                      setReminderFormViolationId(null);
                      window.location.reload();
                    } else setReminderError(err.error);
                  }}
                  className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Remove reminder
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setReminderFormViolationId(null);
                  setReminderError(null);
                }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
            {reminderError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{reminderError}</p>
            )}
          </div>
        )}
        {isExpanded && (
          <div
            className="border-t border-zinc-100 px-4 pb-4 pt-2 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Inspector notes:
              </p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {v.violation_inspector_comments?.trim() || "No inspector comments on file."}
              </p>
            </div>
            <div className="mb-3">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Municipal code section:
              </p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {v.violation_ordinance?.trim() || "—"}
              </p>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {v.violation_status_date && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    Status last updated
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {new Date(v.violation_status_date).toLocaleDateString()}
                  </dd>
                </>
              )}
              {v.inspector_id && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    Inspector ID
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {v.inspector_id}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {(violationsQueryError || (violations.length === 0 && !violationsQueryError)) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          {violationsQueryError ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Could not load violations: {violationsQueryError}. If you recently ran database migrations, try re-scanning the property.
            </p>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No violations on record. Re-scan to fetch from the City database.
            </p>
          )}
          <button
            type="button"
            disabled={rescanning}
            onClick={async () => {
              setRescanError(null);
              setRescanning(true);
              const result = await rescanPropertyViolations(propertyId);
              setRescanning(false);
              if (result.error) setRescanError(result.error);
              else if (result.count !== undefined) window.location.reload();
            }}
            className="mt-2 rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            {rescanning ? "Re-scanning…" : "Re-scan property"}
          </button>
          {rescanError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{rescanError}</p>
          )}
        </div>
      )}

      {propertyGroup && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This property is part of building group <strong>{propertyGroup}</strong>.
            Violations may be filed under related addresses.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm font-medium text-red-700 dark:text-red-400">
          {totalOpen} open
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {totalClosed} closed
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Compliance rate: {complianceRate}%
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          First: {firstDate ? new Date(firstDate).toLocaleDateString() : "—"}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Most recent:{" "}
          {mostRecentDate ? new Date(mostRecentDate).toLocaleDateString() : "—"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Filter:
        </span>
        {(
          [
            { key: "all" as const, label: "All" },
            { key: "open" as const, label: "Open only" },
            { key: "complaints" as const, label: "Complaints only" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === key
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
        {canExportCsv && (
          <button
            type="button"
            onClick={downloadCsv}
            className="ml-auto rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
        )}
        {!canExportCsv && (
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-500">
            Upgrade to Pro for CSV export
          </span>
        )}
      </div>

      <div className="mt-4 space-y-6">
        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Open violations ({openViolations.length})
            </h2>
            <div className="relative inline-flex" ref={infoPopoverAnchor === "section" ? infoPopoverRef : undefined}>
              <button
                type="button"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-500"
                title="Violation process & fines"
                onClick={() => setInfoPopoverAnchor(infoPopoverAnchor === "section" ? null : "section")}
                aria-label="Show guidance"
              >
                <span className="text-xs font-semibold">i</span>
              </button>
              {infoPopoverAnchor === "section" && (
                <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{POPOVER_GUIDANCE_TEXT}</p>
                </div>
              )}
            </div>
            {openViolations.length > 0 && (
              <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={bulkReminderOn || allOpenHaveSameReminder}
                  onChange={(e) => {
                    setBulkReminderOn(e.target.checked);
                    if (!e.target.checked) setBulkConfirmOverride(false);
                  }}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Set reminder for all open violations
              </label>
            )}
          </div>
          {bulkReminderOn && openViolations.length > 0 && (
            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              {(() => {
                const withReminder = openViolations.filter((o) => remindersByViolation[o.id]).length;
                const needConfirm = withReminder > 0 && !bulkConfirmOverride;
                return (
                  <>
                    {needConfirm ? (
                      <>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          {`This will override ${withReminder} existing individual reminder${withReminder !== 1 ? "s" : ""}. Continue?`}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBulkConfirmOverride(true)}
                            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                          >
                            Continue
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkReminderOn(false)}
                            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          One deadline and frequency for all {openViolations.length} open violations
                        </p>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-xs text-zinc-600 dark:text-zinc-400">Deadline (from notice)</label>
                            <input
                              type="date"
                              value={bulkDeadline}
                              onChange={(e) => setBulkDeadline(e.target.value)}
                              className="mt-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-600 dark:text-zinc-400">Remind me</label>
                            <select
                              value={bulkFrequency}
                              onChange={(e) => setBulkFrequency(e.target.value as ReminderFrequency)}
                              className="mt-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            >
                              {REMINDER_FREQUENCY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            disabled={bulkSubmitting || !bulkDeadline}
                            onClick={async () => {
                              setBulkSubmitting(true);
                              const err = await setBulkViolationReminders(
                                propertyId,
                                openViolations.map((o) => o.id),
                                bulkDeadline,
                                bulkFrequency
                              );
                              setBulkSubmitting(false);
                              if (!err.error) {
                                setBulkReminderOn(false);
                                setBulkConfirmOverride(false);
                                window.location.reload();
                              }
                            }}
                            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                          >
                            {bulkSubmitting ? "Saving…" : "Save for all"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setBulkReminderOn(false); setBulkConfirmOverride(false); }}
                            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          <div className="space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {filteredOpen.length === 0 ? (
              <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
                No open violations
                {filter === "complaints" ? " that are COMPLAINT type." : "."}
              </div>
            ) : (
              filteredOpen.map((v) => renderRow(v, true))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-zinc-700 dark:text-zinc-300">
            Historical / closed violations ({historicalViolations.length})
          </h2>
          <div className="space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {filteredHistorical.length === 0 ? (
              <div className="rounded-lg bg-white px-4 py-6 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
                No closed violations.
              </div>
            ) : (
              filteredHistorical.map((v) => renderRow(v, false))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
