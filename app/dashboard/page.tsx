import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardContent } from "./DashboardContent";

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
    .select("id, address, nickname, city_id, last_scanned_at, property_group")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cityIds = [...new Set((properties ?? []).map((p) => p.city_id))];
  const { data: citiesForMap } = await supabase
    .from("cities")
    .select("id, name, slug")
    .in("id", cityIds);
  const cityMap = new Map((citiesForMap ?? []).map((c) => [c.id, c]));
  const { data: citiesForFilter } = await supabase
    .from("cities")
    .select("id, name, slug")
    .in("slug", ["chicago", "philadelphia"]);
  const cities = citiesForFilter ?? [];

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

        <DashboardContent
          properties={properties ?? []}
          cityMap={cityMap}
          violationsByProperty={violationsByProperty}
          cities={cities}
        />
      </main>
    </div>
  );
}
