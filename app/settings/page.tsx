import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, plan, email_alerts_enabled, sms_alerts_enabled, alert_complaint, alert_periodic, alert_registration, alert_permit")
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
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Notification settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose how you want to be notified about new violations and reminders.
        </p>

        <SettingsForm
          profile={{
            phone: profile?.phone ?? "",
            email_alerts_enabled: profile?.email_alerts_enabled ?? true,
            sms_alerts_enabled: profile?.sms_alerts_enabled ?? false,
            alert_complaint: true,
            alert_periodic: profile?.alert_periodic ?? true,
            alert_registration: profile?.alert_registration ?? true,
            alert_permit: profile?.alert_permit ?? true,
          }}
          isPaid={isPaid}
        />
      </main>
    </div>
  );
}
