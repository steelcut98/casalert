"use client";

import { useState } from "react";
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

const TOTAL_PROPERTIES = ["1", "2-5", "6-10", "11-25", "25+"];

const CONCERNS = [
  "Tenant complaints",
  "Missing deadlines",
  "Inspector visits",
  "Fines & legal costs",
  "Keeping good records",
];

const REFERRAL_SOURCES = [
  "BiggerPockets",
  "Reddit",
  "Facebook group",
  "Google search",
  "Friend or referral",
  "Other",
];

export function PropertyQuestionnaire({ propertyId, showUserQuestions }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [propertyType, setPropertyType] = useState<string>("");
  const [managementType, setManagementType] = useState<string>("");
  const [approximateRent, setApproximateRent] = useState<string>("");
  const [totalPropertiesOwned, setTotalPropertiesOwned] = useState<string>("");
  const [biggestConcerns, setBiggestConcerns] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState<string>("");

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
          ...(showUserQuestions && {
            total_properties_owned: totalPropertiesOwned || null,
            biggest_concerns: biggestConcerns.length > 0 ? biggestConcerns : null,
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

  function toggleConcern(c: string) {
    setBiggestConcerns((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Help us give you better insights
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        These optional questions help us tailor your experience. Skip any you prefer not to answer.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Property type
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {PROPERTY_TYPES.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="property_type"
                  checked={propertyType === opt}
                  onChange={() => setPropertyType(opt)}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            How is this property managed?
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {MANAGEMENT_TYPES.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="management_type"
                  checked={managementType === opt}
                  onChange={() => setManagementType(opt)}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Approximate monthly rent
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {RENT_RANGES.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="approximate_rent"
                  checked={approximateRent === opt}
                  onChange={() => setApproximateRent(opt)}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {showUserQuestions && (
          <>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                How many rental properties do you own in total?
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {TOTAL_PROPERTIES.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="total_properties"
                      checked={totalPropertiesOwned === opt}
                      onChange={() => setTotalPropertiesOwned(opt)}
                      className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                What are your biggest compliance concerns?
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {CONCERNS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={biggestConcerns.includes(opt)}
                      onChange={() => toggleConcern(opt)}
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                How did you hear about CasAlerts?
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {REFERRAL_SOURCES.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="referral_source"
                      checked={referralSource === opt}
                      onChange={() => setReferralSource(opt)}
                      className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          className="text-sm font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
