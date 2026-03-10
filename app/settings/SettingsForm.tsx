"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { updateProfileField } from "./actions";

type Props = {
  email: string;
  profile: {
    phone: string;
    stripe_customer_id: string | null;
    subscription_cancel_at: string | null;
    email_alerts_enabled: boolean;
    sms_alerts_enabled: boolean;
    email_reminders_enabled: boolean;
    sms_reminders_enabled: boolean;
    alert_complaint: boolean;
    alert_periodic: boolean;
    alert_registration: boolean;
    alert_permit: boolean;
  };
  plan: string;
  isPaid: boolean;
};

export function SettingsForm({ email, profile, plan, isPaid }: Props) {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [phone, setPhone] = useState(profile.phone);
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function showSaved(key: string) {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  }

  async function handleFieldChange(field: string, value: string | boolean) {
    const result = await updateProfileField(field, value);
    if (!result.error) showSaved(field);
  }

  function handleThemeChange(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Appearance — Theme */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Appearance
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              theme === "dark"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              theme === "light"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            Light
          </button>
        </div>
      </section>

      {/* Section 1 — Contact information */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Contact information
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              To change your email, contact support.
            </p>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleFieldChange("phone", phone)}
              placeholder="+1 (555) 123-4567"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Format: +1 (555) 123-4567
            </p>
            {savedKey === "phone" && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Saved</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 2 — New violation alerts */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          New violation alerts
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          These fire when the CRON scan detects a new violation.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.email_alerts_enabled}
              onChange={(e) => handleFieldChange("email_alerts_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Email alerts</span>
            {savedKey === "email_alerts_enabled" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.sms_alerts_enabled}
              disabled={!isPaid}
              onChange={(e) => handleFieldChange("sms_alerts_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 disabled:opacity-50"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">SMS alerts</span>
            {!isPaid && (
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                Available on Starter and Pro plans
              </span>
            )}
            {savedKey === "sms_alerts_enabled" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
        </div>
      </section>

      {/* Section 3 — Reminder notifications */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Reminder notifications
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          These fire when a deadline you set is approaching.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.email_reminders_enabled}
              onChange={(e) => handleFieldChange("email_reminders_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Email reminders</span>
            {savedKey === "email_reminders_enabled" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.sms_reminders_enabled}
              disabled={!isPaid}
              onChange={(e) => handleFieldChange("sms_reminders_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 disabled:opacity-50"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">SMS reminders</span>
            {!isPaid && (
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                Available on Starter and Pro plans
              </span>
            )}
            {savedKey === "sms_reminders_enabled" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
        </div>
      </section>

      {/* Section 4 — Violation types to monitor */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Violation types to monitor
        </h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              readOnly
              disabled
              className="h-4 w-4 rounded border-zinc-300 opacity-70"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              COMPLAINT
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              COMPLAINT alerts cannot be disabled — these represent the highest risk to property owners.
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.alert_periodic}
              onChange={(e) => handleFieldChange("alert_periodic", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">PERIODIC</span>
            {savedKey === "alert_periodic" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.alert_registration}
              onChange={(e) => handleFieldChange("alert_registration", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">REGISTRATION</span>
            {savedKey === "alert_registration" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              defaultChecked={profile.alert_permit}
              onChange={(e) => handleFieldChange("alert_permit", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">PERMIT</span>
            {savedKey === "alert_permit" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>
            )}
          </label>
        </div>
      </section>

      {/* Section 5 — Plan & billing */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Plan & billing
        </h2>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Current plan: {plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro"}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {plan === "free" && "Monitor properties with email alerts. Upgrade for SMS and more properties."}
            {plan === "starter" && "Email and SMS alerts, more properties."}
            {plan === "pro" && "Full access: SMS alerts, priority support, unlimited properties."}
          </p>
          {profile.subscription_cancel_at &&
            new Date(profile.subscription_cancel_at).getTime() > Date.now() && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-600 dark:bg-amber-950/40">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  <span aria-hidden="true">⚠️</span>{" "}
                  Your {plan === "starter" ? "Starter" : "Pro"} plan is scheduled to end on{" "}
                  {new Date(profile.subscription_cancel_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  . You&apos;ll lose access to premium features after this date.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/stripe/portal", { method: "POST" });
                    const data = await res.json();
                    if (data?.url) window.location.href = data.url;
                  }}
                  className="mt-2 text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
                >
                  Reinstate subscription
                </button>
              </div>
            )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Upgrade plan
            </Link>
            {profile.stripe_customer_id && (
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/stripe/portal", { method: "POST" });
                  const data = await res.json();
                  if (data?.url) window.location.href = data.url;
                }}
                className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Manage billing
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
