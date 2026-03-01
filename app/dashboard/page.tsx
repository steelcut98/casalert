import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardPropertyCards } from "./DashboardPropertyCards";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, city_id, last_scanned_at, property_group")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cityIds = [...new Set((properties ?? []).map((p) => p.city_id))];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, slug")
    .in("id", cityIds);
  const cityMap = new Map((cities ?? []).map((c) => [c.id, c]));

  let violationsByProperty: Record<string, { open: number; complaint: number; byCategory: Record<string, number> }> = {};
  if (properties && properties.length > 0) {
    const { data: violations } = await supabase
      .from("violations")
      .select("property_id, violation_status, inspection_category")
      .in("property_id", properties.map((p) => p.id));
    for (const p of properties) {
      const list = (violations ?? []).filter((v) => v.property_id === p.id);
      const open = list.filter(
        (v) => (v.violation_status ?? "").toUpperCase() === "OPEN"
      ).length;
      const complaint = list.filter(
        (v) =>
          (v.violation_status ?? "").toUpperCase() === "OPEN" &&
          (v.inspection_category ?? "").toUpperCase() === "COMPLAINT"
      ).length;
      const byCategory: Record<string, number> = {};
      for (const v of list.filter((x) => (x.violation_status ?? "").toUpperCase() === "OPEN")) {
        const cat = v.inspection_category ?? "Unknown";
        byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      }
      violationsByProperty[p.id] = { open, complaint, byCategory };
    }
  }

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
          <div className="flex items-center gap-4">
            <Link
              href="/onboarding"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Add property
            </Link>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Your monitored properties. Open violations and COMPLAINT counts are
          highlighted.
        </p>

        <DashboardPropertyCards
          properties={properties ?? []}
          cityMap={cityMap}
          violationsByProperty={violationsByProperty}
        />
      </main>
    </div>
  );
}
