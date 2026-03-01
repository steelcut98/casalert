"use client";

import { useState } from "react";
import { updateNotificationSettings } from "./actions";

type Props = {
  profile: {
    phone: string;
    email_alerts_enabled: boolean;
    sms_alerts_enabled: boolean;
    alert_complaint: boolean;
    alert_periodic: boolean;
    alert_registration: boolean;
    alert_permit: boolean;
  };
  isPaid: boolean;
};

export function SettingsForm({ profile, isPaid }: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateNotificationSettings(formData);
    setSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "ok", text: "Settings saved." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Phone number (for SMS alerts)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone}
          placeholder="+1 312 555 0123"
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Alert channels
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="email_alerts"
            defaultChecked={profile.email_alerts_enabled}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Email alerts</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="sms_alerts"
            defaultChecked={profile.sms_alerts_enabled}
            disabled={!isPaid}
            className="h-4 w-4 rounded border-zinc-300 disabled:opacity-50"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            SMS alerts {!isPaid && "(Starter/Pro only)"}
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notify me for these violation types
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked
            readOnly
            className="h-4 w-4 rounded border-zinc-300 opacity-70"
          />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            COMPLAINT (tenant 311 — always on)
          </span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="alert_periodic"
            defaultChecked={profile.alert_periodic}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">PERIODIC</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="alert_registration"
            defaultChecked={profile.alert_registration}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">REGISTRATION</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="alert_permit"
            defaultChecked={profile.alert_permit}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">PERMIT</span>
        </label>
      </div>

      {message && (
        <p
          className={
            message.type === "ok"
              ? "text-sm text-emerald-600 dark:text-emerald-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
