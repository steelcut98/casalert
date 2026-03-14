"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  propertyId: string;
  showUserQuestions: boolean;
};

const PROPERTY_TYPES = [
  "Single family",
  "2-4 units",
  "5-10 units",
  "10+ units",
];

const MANAGEMENT_TYPES = [
  "I self-manage",
  "Property manager",
  "Both",
];

const RENT_RANGES = [
  "Under $1,000",
  "$1,000-$2,000",
  "$2,000-$3,000",
  "$3,000-$5,000",
  "$5,000+",
];

const LAST_INSPECTED = [
  "Never",
  "Within 6 months",
  "6-12 months ago",
  "1-2 years ago",
  "2+ years ago",
  "Not sure",
];

const SURPRISED_BY_VIOLATION = ["Yes", "No"];

const HELP_WITH = [
  "Catching violations early",
  "Avoiding fines",
  "Tracking deadlines",
  "Keeping compliance records",
  "Monitoring tenant complaints",
  "Peace of mind",
];

const REFERRAL_SOURCES = [
  "BiggerPockets",
  "Reddit",
  "Facebook group",
  "Google search",
  "Friend or referral",
  "Other",
];

const radioClass =
  "h-4 w-4 border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 dark:border-zinc-600";
const checkboxClass =
  "h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 dark:border-zinc-600";

export function PropertyQuestionnaire({ propertyId, showUserQuestions }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [propertyType, setPropertyType] = useState<string>("");
  const [managementType, setManagementType] = useState<string>("");
  const [approximateRent, setApproximateRent] = useState<string>("");
  const [lastInspected, setLastInspected] = useState<string>("");
  const [surprisedByViolation, setSurprisedByViolation] = useState<string>("");
  const [helpWith, setHelpWith] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState<string>("");

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          property_type: propertyType || null,
          management_type: managementType || null,
          approximate_rent: approximateRent || null,
          last_inspected: lastInspected || null,
          surprised_by_violation: surprisedByViolation || null,
          ...(showUserQuestions && {
            biggest_concerns: helpWith.length > 0 ? helpWith : null,
            referral_source: referralSource || null,
          }),
        }),
      });
    } finally {
      setSaving(false);
    }
    router.push("/dashboard");
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  function toggleHelpWith(c: string) {
    setHelpWith((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="questionnaire-title"
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      <div
        className={`relative w-full max-w-lg rounded-xl bg-zinc-900 p-8 shadow-xl transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="questionnaire-title"
          className="text-lg font-semibold text-zinc-100"
        >
          Help us give you better insights
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          These optional questions help us tailor your experience.
        </p>

        <div className="mt-6 space-y-0">
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300">Property type</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 hover:bg-zinc-800"
                >
                  <input
                    type="radio"
                    name="property_type"
                    checked={propertyType === opt}
                    onChange={() => setPropertyType(opt)}
                    className={radioClass}
                  />
                  <span className="text-sm text-zinc-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300">
              How is this property managed?
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {MANAGEMENT_TYPES.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="management_type"
                    checked={managementType === opt}
                    onChange={() => setManagementType(opt)}
                    className={radioClass}
                  />
                  <span className="text-sm text-zinc-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300">
              Approximate monthly rent
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {RENT_RANGES.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="approximate_rent"
                    checked={approximateRent === opt}
                    onChange={() => setApproximateRent(opt)}
                    className={radioClass}
                  />
                  <span className="text-sm text-zinc-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300">
              When was this property last inspected by the city?
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {LAST_INSPECTED.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="last_inspected"
                    checked={lastInspected === opt}
                    onChange={() => setLastInspected(opt)}
                    className={radioClass}
                  />
                  <span className="text-sm text-zinc-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300">
              Have you ever been surprised by a violation you didn&apos;t know
              about?
            </p>
            <div className="mt-2 flex gap-4">
              {SURPRISED_BY_VIOLATION.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="surprised_by_violation"
                    checked={surprisedByViolation === opt}
                    onChange={() => setSurprisedByViolation(opt)}
                    className={radioClass}
                  />
                  <span className="text-sm text-zinc-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {showUserQuestions && (
            <>
              <div className="mb-6">
                <p className="text-sm font-medium text-zinc-300">
                  What would you most like CasAlerts to help with?
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {HELP_WITH.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 hover:bg-zinc-800"
                    >
                      <input
                        type="checkbox"
                        checked={helpWith.includes(opt)}
                        onChange={() => toggleHelpWith(opt)}
                        className={checkboxClass}
                      />
                      <span className="text-sm text-zinc-300">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-zinc-300">
                  How did you hear about CasAlerts?
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {REFERRAL_SOURCES.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="referral_source"
                        checked={referralSource === opt}
                        onChange={() => setReferralSource(opt)}
                        className={radioClass}
                      />
                      <span className="text-sm text-zinc-300">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-500">All questions are optional</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-zinc-500 underline hover:text-zinc-400"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
