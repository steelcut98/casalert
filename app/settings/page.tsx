import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, plan, stripe_customer_id, subscription_cancel_at, email_alerts_enabled, sms_alerts_enabled, email_reminders_enabled, sms_reminders_enabled, alert_complaint, alert_periodic, alert_registration, alert_permit")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const isPaid = plan === "starter" || plan === "pro";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            CasAlert
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Settings"
              aria-label="Settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your contact info, alerts, and plan.
        </p>

        <SettingsForm
          email={user.email ?? ""}
          profile={{
            phone: profile?.phone ?? "",
            stripe_customer_id: profile?.stripe_customer_id ?? null,
            subscription_cancel_at: profile?.subscription_cancel_at ?? null,
            email_alerts_enabled: profile?.email_alerts_enabled ?? true,
            sms_alerts_enabled: profile?.sms_alerts_enabled ?? false,
            email_reminders_enabled: profile?.email_reminders_enabled ?? true,
            sms_reminders_enabled: profile?.sms_reminders_enabled ?? false,
            alert_complaint: true,
            alert_periodic: profile?.alert_periodic ?? true,
            alert_registration: profile?.alert_registration ?? true,
            alert_permit: profile?.alert_permit ?? true,
          }}
          plan={plan}
          isPaid={isPaid}
        />
      </main>
    </div>
  );
}
