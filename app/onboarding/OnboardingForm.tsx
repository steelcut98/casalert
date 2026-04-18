"use client";

import { useState, useEffect, useRef } from "react";
import { addPropertyWithBaselineScan, type OnboardingResult } from "./actions";
import { propertyLimitLabel } from "@/lib/plans";
import { generateRiskBriefing } from "@/lib/risk-briefing";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PlanTier = "free" | "starter" | "pro";

export function OnboardingForm({
  canAddProperty,
  plan,
  currentCount,
  showUserQuestions: _showUserQuestions,
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
  const router = useRouter();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [quickProperties, setQuickProperties] = useState<string | null>(null);
  const [quickRole, setQuickRole] = useState<string | null>(null);
  const [quickManagement, setQuickManagement] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [exactPropertyCount, setExactPropertyCount] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [optPropertyType, setOptPropertyType] = useState<string | null>(null);
  const [optOccupied, setOptOccupied] = useState<string | null>(null);
  const [optRent, setOptRent] = useState<string | null>(null);
  const [optAcquisition, setOptAcquisition] = useState<string | null>(null);
  const [optContractor, setOptContractor] = useState<string | null>(null);
  const [optSaving, setOptSaving] = useState(false);

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

  async function submitQuickQuestions(propertyId: string) {
    setQuickSaving(true);
    try {
      await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          total_properties_owned: exactPropertyCount.trim() || quickProperties,
          ownership_role: quickRole,
          management_type: quickManagement,
          property_management_company: companyName.trim() || null,
          management_company_website: companyWebsite.trim() || null,
        }),
      });
    } catch (err) {
      console.error("Quick questions save error", err);
    }
    setQuickSaving(false);
    setOnboardingStep(3);
  }

  async function submitOptionalQuestions(propertyId: string) {
    setOptSaving(true);
    try {
      await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          property_type: optPropertyType,
          occupied_status: optOccupied,
          approximate_rent: optRent,
          acquisition_method: optAcquisition,
          has_preferred_contractor: optContractor === "yes" ? true : optContractor === "no" ? false : null,
        }),
      });
    } catch (err) {
      console.error("Optional questions save error", err);
    }
    setOptSaving(false);
    router.push(`/dashboard/${propertyId}`);
  }

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
      setOnboardingStep(1);
      setQuickProperties(null);
      setQuickRole(null);
      setQuickManagement(null);
      setOptPropertyType(null);
      setOptOccupied(null);
      setOptRent(null);
      setOptAcquisition(null);
      setOptContractor(null);
      setExactPropertyCount("");
      setCompanyName("");
      setCompanyWebsite("");
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
            <div className="mt-3 flex items-center gap-3">
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Upgrade plan
              </a>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-amber-800 underline dark:text-amber-200"
              >
                Back to dashboard
              </Link>
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
        <div className="w-full max-w-lg my-8 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-xl">
          <div className="flex items-center gap-0 border-b border-zinc-200 dark:border-zinc-800">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
                s === onboardingStep
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : s < onboardingStep
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500"
              }`}>
                {s < onboardingStep ? "✓ " : ""}{s === 1 ? "Summary" : s === 2 ? "Quick info" : "Details"}
              </div>
            ))}
          </div>

          <div className="p-6">
          {onboardingStep === 1 && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                  <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Property added</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{result.address} · {result.cityName}</p>
                </div>
              </div>

              {result.warning && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">{result.warning}</p>
              )}

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-zinc-800">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.openCount}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Open</p>
                </div>
                <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-zinc-800">
                  <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-300">{result.closedCount}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Closed</p>
                </div>
                <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-zinc-800">
                  {(() => {
                    const briefing = generateRiskBriefing(
                      result.violations.map((v) => ({
                        violation_description: v.violation_description,
                        violation_code: v.violation_code,
                        violation_status: v.violation_status,
                        violation_date: v.violation_date,
                        inspection_category: v.inspection_category,
                      }))
                    );
                    return (
                      <>
                        <p className={`text-lg font-bold ${
                          briefing.riskLevel === "critical" ? "text-red-600 dark:text-red-400" :
                          briefing.riskLevel === "high" ? "text-orange-600 dark:text-orange-400" :
                          briefing.riskLevel === "moderate" ? "text-amber-600 dark:text-amber-400" :
                          "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {briefing.riskLevel.charAt(0).toUpperCase() + briefing.riskLevel.slice(1)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Risk level</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {onboardingStep === 2 && (
            <>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Quick questions</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Help us tailor CasAlerts to your property — takes 10 seconds.</p>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">How many properties do you own or manage?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["1", "2-4", "5-10", "11-50", "50+"].map((opt) => (
                      <button key={opt} type="button" onClick={() => { setQuickProperties(opt); setExactPropertyCount(""); }}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          quickProperties === opt && !exactPropertyCount
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt}</button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      placeholder="Exact #"
                      value={exactPropertyCount}
                      onChange={(e) => { setExactPropertyCount(e.target.value); setQuickProperties(null); }}
                      className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">What&apos;s your role?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{value:"owner_occupant",label:"Owner-occupant"},{value:"landlord",label:"Landlord"},{value:"property_manager",label:"Property manager"}].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setQuickRole(opt.value)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          quickRole === opt.value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                  {quickRole === "property_manager" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input type="text" placeholder="Company name (optional)" value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                      <input type="url" placeholder="Website (optional)" value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">How is it managed?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{value:"self_managed",label:"Self-managed"},{value:"management_company",label:"Management company"}].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setQuickManagement(opt.value)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          quickManagement === opt.value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                  {quickManagement === "management_company" && quickRole !== "property_manager" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input type="text" placeholder="Company name (optional)" value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                      <input type="url" placeholder="Website (optional)" value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button type="button" disabled={quickSaving}
                  onClick={() => submitQuickQuestions(result.propertyId)}
                  className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {quickSaving ? "Saving…" : "Continue"}
                </button>
              </div>
            </>
          )}

          {onboardingStep === 3 && (
            <>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">A few more details</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Optional — helps us provide better insights.</p>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Property type</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{value:"single_family",label:"Single family"},{value:"multi_family",label:"Multi-family"},{value:"condo",label:"Condo/Co-op"},{value:"mixed_use",label:"Mixed use"},{value:"commercial",label:"Commercial"}].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setOptPropertyType(opt.value)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          optPropertyType === opt.value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Is this property currently occupied?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{value:"occupied",label:"Occupied"},{value:"vacant",label:"Vacant"},{value:"partial",label:"Partially occupied"}].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setOptOccupied(opt.value)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          optOccupied === opt.value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Approximate monthly rent</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Under $1,000","$1,000-$2,000","$2,000-$3,000","$3,000-$5,000","$5,000+","N/A"].map((opt) => (
                      <button key={opt} type="button" onClick={() => setOptRent(opt)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          optRent === opt
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">How did you acquire this property?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Purchased","Inherited","Built","Foreclosure","Other"].map((opt) => (
                      <button key={opt} type="button" onClick={() => setOptAcquisition(opt.toLowerCase())}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          optAcquisition === opt.toLowerCase()
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Do you have preferred contractors or handymen?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{value:"yes",label:"Yes"},{value:"no",label:"No"}].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setOptContractor(opt.value)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          optContractor === opt.value
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button type="button" disabled={optSaving}
                  onClick={() => submitOptionalQuestions(result.propertyId)}
                  className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {optSaving ? "Saving…" : "Save & view property"}
                </button>
                <button type="button"
                  onClick={() => router.push(`/dashboard/${result.propertyId}`)}
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">Skip</button>
              </div>
            </>
          )}
          </div>
        </div>
        </div>
      )}
    </>
  );
}
