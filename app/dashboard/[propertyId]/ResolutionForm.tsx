"use client";

import { useState } from "react";
import { submitResolution } from "./actions";

const RESOLUTION_METHODS = [
  "Fixed by me",
  "Hired a contractor",
  "Hired a handyman",
  "Property manager handled it",
  "Issue dismissed by city",
  "Other",
];

const COST_RANGES = [
  "$0",
  "$1-$100",
  "$100-$250",
  "$250-$500",
  "$500-$1,000",
  "$1,000-$2,500",
  "$2,500-$5,000",
  "$5,000-$10,000",
  "$10,000+",
];

const CONTRACTOR_TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "General contracting",
  "Roofing",
  "Pest control",
  "Fire safety",
  "Structural",
  "Painting",
  "Carpentry",
  "Other",
];

const AFFECTED_AREAS = [
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Living area",
  "Hallway",
  "Exterior",
  "Basement",
  "Roof",
  "Electrical system",
  "Plumbing system",
  "HVAC",
  "Fire safety",
  "Structural",
  "Common area",
  "Other",
];

const CONTRACTOR_SOURCE_OPTIONS = [
  "Already knew them",
  "Online search",
  "Referral from someone",
  "Property management company",
  "Other",
];

export function ResolutionForm({
  violationId,
  propertyId,
  violationDescription,
  violationCode,
  onClose,
  onSubmitted,
}: {
  violationId: string;
  propertyId: string;
  violationDescription: string | null;
  violationCode: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolutionMethod, setResolutionMethod] = useState("");
  const [resolutionMethodOther, setResolutionMethodOther] = useState("");
  const [fixDate, setFixDate] = useState("");
  const [emergencyFix, setEmergencyFix] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState("");
  const [contractorSource, setContractorSource] = useState("");

  const [costRange, setCostRange] = useState("");
  const [exactCost, setExactCost] = useState("");
  const [multipleQuotes, setMultipleQuotes] = useState<string>("");
  const [quotesCount, setQuotesCount] = useState("");

  const [contractorName, setContractorName] = useState("");
  const [contractorTrade, setContractorTrade] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [contractorWebsite, setContractorWebsite] = useState("");
  const [wouldUseAgain, setWouldUseAgain] = useState("");
  const [contractorRating, setContractorRating] = useState(0);
  const [starHover, setStarHover] = useState(0);
  const [workOnSchedule, setWorkOnSchedule] = useState("");

  const [affectedAreas, setAffectedAreas] = useState<string[]>([]);
  const [affectedAreaOther, setAffectedAreaOther] = useState("");
  const [additionalIssues, setAdditionalIssues] = useState<string>("");
  const [additionalIssuesDesc, setAdditionalIssuesDesc] = useState("");
  const [fixDescription, setFixDescription] = useState("");
  const [casalertsFirst, setCasalertsFirst] = useState("");
  const [deadlineMet, setDeadlineMet] = useState("");

  const needsContractor =
    resolutionMethod === "Hired a contractor" ||
    resolutionMethod === "Hired a handyman";

  const totalSteps = needsContractor ? 4 : 3;

  function effectiveStep() {
    if (!needsContractor && step >= 3) return step + 1;
    return step;
  }

  function canGoNext() {
    const s = effectiveStep();
    if (s === 1) return resolutionMethod !== "";
    if (s === 2) return costRange !== "";
    if (s === 3) return true;
    return true;
  }

  function handleNext() {
    if (step < totalSteps) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function toggleArea(area: string) {
    setAffectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function buildFinalAffectedAreas(): string[] {
    const areas = affectedAreas.filter((a) => a !== "Other");
    if (affectedAreas.includes("Other") && affectedAreaOther.trim()) {
      areas.push(`Other: ${affectedAreaOther.trim()}`);
    } else if (affectedAreas.includes("Other")) {
      areas.push("Other");
    }
    return areas;
  }

  function buildResolutionMethod(): string {
    if (resolutionMethod === "Other" && resolutionMethodOther.trim()) {
      return `Other: ${resolutionMethodOther.trim()}`;
    }
    return resolutionMethod;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await submitResolution({
      violationId,
      propertyId,
      resolutionMethod: buildResolutionMethod(),
      fixDate: fixDate || null,
      emergencyFix:
        emergencyFix === "Emergency"
          ? true
          : emergencyFix === "Scheduled"
            ? false
            : null,
      isRecurring,
      costRange,
      exactCost: exactCost ? Number(exactCost) : null,
      multipleQuotes: multipleQuotes === "Yes",
      quotesCount: multipleQuotes === "Yes" && quotesCount ? Number(quotesCount) : null,
      contractorName: contractorName || null,
      contractorTrade: contractorTrade || null,
      contractorPhone: contractorPhone || null,
      contractorWebsite: contractorWebsite || null,
      wouldUseAgain: wouldUseAgain || null,
      contractorRating: contractorRating > 0 ? contractorRating : null,
      contractorSource: contractorSource || null,
      workOnSchedule: workOnSchedule || null,
      affectedAreas: buildFinalAffectedAreas(),
      additionalIssuesFound: additionalIssues === "Yes",
      additionalIssuesDescription:
        additionalIssues === "Yes" ? additionalIssuesDesc || null : null,
      fixDescription: fixDescription || null,
      casalertsAlertedFirst: casalertsFirst,
      deadlineMet,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSubmitted();
    }
  }

  const labelCls = "block text-sm font-medium text-zinc-400 mb-2";
  const radioCls =
    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm";
  const radioSelected = "border-zinc-500 bg-zinc-700/60 text-zinc-100";
  const radioUnselected = "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600";
  const inputCls =
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500";

  function RadioGroup({
    options,
    value,
    onChange,
  }: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`${radioCls} ${value === opt ? radioSelected : radioUnselected}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  function StarRating({
    value,
    hover,
    onChange,
    onHover,
    onLeave,
  }: {
    value: number;
    hover: number;
    onChange: (v: number) => void;
    onHover: (v: number) => void;
    onLeave: () => void;
  }) {
    const active = hover || value;
    return (
      <div className="flex gap-1" onMouseLeave={onLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            className={`h-8 w-8 flex items-center justify-center text-2xl transition-colors ${
              star <= active ? "text-amber-400" : "text-zinc-600 hover:text-zinc-500"
            }`}
          >
            {star <= active ? "★" : "☆"}
          </button>
        ))}
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>How was this issue resolved?</label>
        <RadioGroup
          options={RESOLUTION_METHODS}
          value={resolutionMethod}
          onChange={setResolutionMethod}
        />
        {resolutionMethod === "Other" && (
          <div className="mt-3">
            <input
              type="text"
              value={resolutionMethodOther}
              onChange={(e) => setResolutionMethodOther(e.target.value)}
              className={inputCls}
              placeholder="Please describe..."
            />
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>When was the fix completed?</label>
        <input
          type="date"
          value={fixDate}
          onChange={(e) => setFixDate(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>
          Was this an emergency fix or scheduled repair?
        </label>
        <RadioGroup
          options={["Emergency", "Scheduled"]}
          value={emergencyFix}
          onChange={setEmergencyFix}
        />
      </div>
      <div>
        <label className={labelCls}>Was this a recurring issue?</label>
        <RadioGroup
          options={["First time", "Has happened before", "Ongoing problem"]}
          value={isRecurring}
          onChange={setIsRecurring}
        />
      </div>
      {needsContractor && (
        <div>
          <label className={labelCls}>How did you find the contractor/repair person?</label>
          <RadioGroup
            options={CONTRACTOR_SOURCE_OPTIONS}
            value={contractorSource}
            onChange={setContractorSource}
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>What was the approximate total cost?</label>
        <RadioGroup
          options={COST_RANGES}
          value={costRange}
          onChange={setCostRange}
        />
      </div>
      <div>
        <label className={labelCls}>Exact amount if known (optional)</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-zinc-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={exactCost}
            onChange={(e) => setExactCost(e.target.value)}
            className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="e.g. 850"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Did you get multiple quotes?</label>
        <RadioGroup
          options={["Yes", "No"]}
          value={multipleQuotes}
          onChange={setMultipleQuotes}
        />
        {multipleQuotes === "Yes" && (
          <div className="mt-3">
            <label className={labelCls}>How many?</label>
            <input
              type="number"
              min="1"
              value={quotesCount}
              onChange={(e) => setQuotesCount(e.target.value)}
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3Contractor = () => (
    <div className="space-y-5">
      <p className="text-sm italic text-zinc-400">
        Sharing contractor details helps CasAlert find you the best-rated, most cost-effective pros when future issues come up.
      </p>
      <div>
        <label className={labelCls}>Contractor/company name</label>
        <input
          type="text"
          value={contractorName}
          onChange={(e) => setContractorName(e.target.value)}
          className={inputCls}
          placeholder="Name"
        />
      </div>
      <div>
        <label className={labelCls}>Trade/specialty</label>
        <select
          value={contractorTrade}
          onChange={(e) => setContractorTrade(e.target.value)}
          className={inputCls}
        >
          <option value="">Select trade...</option>
          {CONTRACTOR_TRADES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Phone number (optional)</label>
        <input
          type="tel"
          value={contractorPhone}
          onChange={(e) => setContractorPhone(e.target.value)}
          className={inputCls}
          placeholder="(555) 555-5555"
        />
      </div>
      <div>
        <label className={labelCls}>Website (optional)</label>
        <input
          type="url"
          value={contractorWebsite}
          onChange={(e) => setContractorWebsite(e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className={labelCls}>Was the work completed on the scheduled date?</label>
        <RadioGroup
          options={["Yes", "No, it was delayed", "N/A"]}
          value={workOnSchedule}
          onChange={setWorkOnSchedule}
        />
      </div>
      <div>
        <label className={labelCls}>Would you use this contractor again?</label>
        <RadioGroup
          options={["Yes", "Maybe", "No"]}
          value={wouldUseAgain}
          onChange={setWouldUseAgain}
        />
      </div>
      <div>
        <label className={labelCls}>Rate their work</label>
        <StarRating
          value={contractorRating}
          hover={starHover}
          onChange={setContractorRating}
          onHover={setStarHover}
          onLeave={() => setStarHover(0)}
        />
      </div>
    </div>
  );

  const renderStepAdditional = () => (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Which areas were affected?</label>
        <div className="flex flex-wrap gap-2">
          {AFFECTED_AREAS.map((area) => (
            <label
              key={area}
              className={`${radioCls} ${
                affectedAreas.includes(area) ? radioSelected : radioUnselected
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={affectedAreas.includes(area)}
                onChange={() => toggleArea(area)}
              />
              {area}
            </label>
          ))}
        </div>
        {affectedAreas.includes("Other") && (
          <div className="mt-3">
            <input
              type="text"
              value={affectedAreaOther}
              onChange={(e) => setAffectedAreaOther(e.target.value)}
              className={inputCls}
              placeholder="Please specify..."
            />
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>
          Were additional issues discovered during the fix?
        </label>
        <RadioGroup
          options={["Yes", "No"]}
          value={additionalIssues}
          onChange={setAdditionalIssues}
        />
        {additionalIssues === "Yes" && (
          <div className="mt-3">
            <input
              type="text"
              value={additionalIssuesDesc}
              onChange={(e) => setAdditionalIssuesDesc(e.target.value)}
              className={inputCls}
              placeholder="Describe the additional issues..."
            />
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>
          Brief description of what was done (optional)
        </label>
        <textarea
          value={fixDescription}
          onChange={(e) => setFixDescription(e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Replaced the broken smoke detector on the second floor..."
        />
      </div>
      <div>
        <label className={labelCls}>
          Did CasAlert notify you of this violation before you knew about it?
        </label>
        <RadioGroup
          options={[
            "Yes, CasAlert told me first",
            "No, I already knew",
            "Not sure",
          ]}
          value={casalertsFirst}
          onChange={setCasalertsFirst}
        />
      </div>
      <div>
        <label className={labelCls}>Did you meet the compliance deadline?</label>
        <RadioGroup
          options={["Yes", "No", "No deadline was set"]}
          value={deadlineMet}
          onChange={setDeadlineMet}
        />
      </div>
    </div>
  );

  function renderCurrentStep() {
    const s = effectiveStep();
    if (s === 1) return renderStep1();
    if (s === 2) return renderStep2();
    if (s === 3) return renderStep3Contractor();
    return renderStepAdditional();
  }

  function stepLabel() {
    const s = effectiveStep();
    if (s === 1) return "Resolution Details";
    if (s === 2) return "Cost & Quotes";
    if (s === 3) return "Contractor Info";
    return "Additional Details";
  }

  const isLastStep = step === totalSteps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Mark as Resolved
            </h2>
            {(violationCode || violationDescription) && (
              <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                {violationCode && <span className="font-mono">{violationCode}</span>}
                {violationCode && violationDescription && " — "}
                {violationDescription}
              </p>
            )}
            <p className="mt-2 text-sm italic text-zinc-400">
              The more details you share, the better CasAlert can assist you — from tracking your costs, to finding the right contractors, to alerting you faster when similar issues come up.
            </p>
          </div>
          <button
            onClick={onClose}
            className="self-start text-zinc-500 hover:text-zinc-300 transition-colors text-xl leading-none ml-4"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
          <span className="text-xs font-medium text-zinc-400">
            Step {step} of {totalSteps}
          </span>
          <div className="flex-1 flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500">{stepLabel()}</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-700 px-6 py-4">
          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Back
                </button>
              )}
              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit Resolution"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
