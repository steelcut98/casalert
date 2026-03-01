import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PropertyDetailClient } from "./PropertyDetailClient";
import { RescanButton } from "./RescanButton";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, city_id, last_scanned_at, property_group")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();
  if (!property) notFound();

  const { data: city } = await supabase
    .from("cities")
    .select("id, name")
    .eq("id", property.city_id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const canExportCsv = (profile?.plan ?? "free") !== "free";

  const { data: violations, error: violationsError } = await supabase
    .from("violations")
    .select(
      "id, violation_date, violation_code, violation_description, violation_status, violation_status_date, violation_inspector_comments, violation_ordinance, inspector_id, inspection_category, address"
    )
    .eq("property_id", propertyId)
    .order("violation_date", { ascending: false });

  if (violationsError) {
    console.error("[property-detail] violations query error", violationsError);
  }

  const rows = (violations ?? []).map((v) => ({
    id: v.id,
    violation_date: v.violation_date,
    violation_code: v.violation_code,
    violation_description: v.violation_description,
    violation_status: v.violation_status,
    violation_status_date: v.violation_status_date,
    violation_inspector_comments: v.violation_inspector_comments,
    violation_ordinance: v.violation_ordinance,
    inspector_id: v.inspector_id,
    inspection_category: v.inspection_category,
    address: v.address,
  }));

  const violationIds = rows.map((r) => r.id);
  const { data: reminders } =
    violationIds.length > 0
      ? await supabase
          .from("violation_reminders")
          .select("id, violation_id, deadline_date, reminder_frequency, next_reminder_at, is_active")
          .in("violation_id", violationIds)
          .eq("is_active", true)
      : { data: [] as { violation_id: string; deadline_date: string; reminder_frequency: string; next_reminder_at: string | null }[] | null };
  const remindersByViolation = new Map(
    (reminders ?? []).map((r) => [
      r.violation_id,
      {
        deadline_date: r.deadline_date,
        reminder_frequency: r.reminder_frequency,
        next_reminder_at: r.next_reminder_at,
      },
    ])
  );

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
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Dashboard
            </Link>
            <Link
              href="/settings"
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Notification settings"
              aria-label="Notification settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {property.address}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-zinc-600 dark:text-zinc-400">
          <span>
            {city?.name ?? "—"} · Last scanned:{" "}
            {property.last_scanned_at
              ? new Date(property.last_scanned_at).toLocaleString()
              : "Never"}
          </span>
          <RescanButton propertyId={propertyId} />
        </p>

        <PropertyDetailClient
          propertyId={propertyId}
          violations={rows}
          violationsQueryError={violationsError?.message ?? null}
          canExportCsv={canExportCsv}
          propertyAddress={property.address}
          propertyGroup={property.property_group}
          remindersByViolation={Object.fromEntries(remindersByViolation)}
        />
      </main>
    </div>
  );
}
