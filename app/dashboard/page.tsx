import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardContent } from "./DashboardContent";
import { calculateComplianceScore } from "@/lib/compliance-score";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const userPlan = profile?.plan ?? "free";

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

  let totalPendingVerification = 0;
  if (properties && properties.length > 0) {
    const { data: pendingViolations } = await supabase
      .from("violations")
      .select("id")
      .in("property_id", properties.map((p) => p.id))
      .eq("user_resolution_status", "pending_verification");
    totalPendingVerification = pendingViolations?.length ?? 0;
  }

  let totalResolved = 0;
  let totalSpendMin = 0;
  let totalSpendMax = 0;
  if (properties && properties.length > 0) {
    const { data: resolutions } = await supabase
      .from("violation_resolutions")
      .select("cost_range, exact_cost")
      .in("property_id", properties.map((p) => p.id));
    totalResolved = resolutions?.length ?? 0;

    const costRangeToMinMax: Record<string, [number, number]> = {
      "$0": [0, 0],
      "$1-$100": [1, 100],
      "$100-$250": [100, 250],
      "$250-$500": [250, 500],
      "$500-$1,000": [500, 1000],
      "$1,000-$2,500": [1000, 2500],
      "$2,500-$5,000": [2500, 5000],
      "$5,000-$10,000": [5000, 10000],
      "$10,000+": [10000, 10000],
    };
    for (const r of resolutions ?? []) {
      if (r.exact_cost != null) {
        totalSpendMin += Number(r.exact_cost);
        totalSpendMax += Number(r.exact_cost);
      } else if (r.cost_range && costRangeToMinMax[r.cost_range]) {
        const [min, max] = costRangeToMinMax[r.cost_range];
        totalSpendMin += min;
        totalSpendMax += max;
      }
    }
  }

  const totalOpenViolations = Object.values(violationsByProperty).reduce((sum, v) => sum + v.open, 0);
  const totalComplaints = Object.values(violationsByProperty).reduce((sum, v) => sum + v.complaint, 0);

  let resolutionsByProperty: Record<string, { resolved: number; pendingVerification: number; spendMin: number; spendMax: number }> = {};
  if (properties && properties.length > 0) {
    const perPropCostMap: Record<string, [number, number]> = {
      "$0": [0, 0],
      "$1-$100": [1, 100],
      "$100-$250": [100, 250],
      "$250-$500": [250, 500],
      "$500-$1,000": [500, 1000],
      "$1,000-$2,500": [1000, 2500],
      "$2,500-$5,000": [2500, 5000],
      "$5,000-$10,000": [5000, 10000],
      "$10,000+": [10000, 10000],
    };

    const { data: allResolutions } = await supabase
      .from("violation_resolutions")
      .select("property_id, cost_range, exact_cost")
      .in("property_id", properties.map((p) => p.id));

    const { data: allPending } = await supabase
      .from("violations")
      .select("property_id")
      .in("property_id", properties.map((p) => p.id))
      .eq("user_resolution_status", "pending_verification");

    for (const p of properties) {
      const propResolutions = (allResolutions ?? []).filter((r) => r.property_id === p.id);
      const propPending = (allPending ?? []).filter((v) => v.property_id === p.id);
      let spendMin = 0;
      let spendMax = 0;
      for (const r of propResolutions) {
        if (r.exact_cost != null) {
          spendMin += Number(r.exact_cost);
          spendMax += Number(r.exact_cost);
        } else if (r.cost_range && perPropCostMap[r.cost_range]) {
          const [min, max] = perPropCostMap[r.cost_range];
          spendMin += min;
          spendMax += max;
        }
      }
      resolutionsByProperty[p.id] = {
        resolved: propResolutions.length,
        pendingVerification: propPending.length,
        spendMin,
        spendMax,
      };
    }
  }

  const { data: previousVisits } = await supabase
    .from("analytics_events")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("event_type", "page_view")
    .eq("page_path", "/dashboard")
    .order("created_at", { ascending: false })
    .limit(2);

  const previousVisitTime = previousVisits && previousVisits.length >= 2
    ? previousVisits[1].created_at
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let newViolationsByProperty: Record<string, number> = {};
  if (properties && properties.length > 0) {
    const { data: newViolations } = await supabase
      .from("violations")
      .select("property_id")
      .in("property_id", properties.map((p) => p.id))
      .gt("first_seen_at", previousVisitTime);

    for (const p of properties) {
      const count = (newViolations ?? []).filter((v) => v.property_id === p.id).length;
      newViolationsByProperty[p.id] = count;
    }
  }

  let overdueByProperty: Record<string, number> = {};
  if (properties && properties.length > 0) {
    const { data: overdueReminders } = await supabase
      .from("violation_reminders")
      .select("violation_id")
      .eq("is_active", true)
      .lt("deadline_date", new Date().toISOString().split("T")[0]);

    if (overdueReminders && overdueReminders.length > 0) {
      const overdueViolationIds = overdueReminders.map((r) => r.violation_id);
      const { data: overdueViolations } = await supabase
        .from("violations")
        .select("id, property_id")
        .in("id", overdueViolationIds)
        .in("property_id", properties.map((p) => p.id));

      for (const p of properties) {
        const count = (overdueViolations ?? []).filter((v) => v.property_id === p.id).length;
        overdueByProperty[p.id] = count;
      }
    }
  }

  let scoresByProperty: Record<string, { score: number; grade: string; gradeColor: string }> = {};
  if (properties && properties.length > 0) {
    const { data: allResolutionsForScore } = await supabase
      .from("violation_resolutions")
      .select("property_id, is_recurring, deadline_met, fix_date, created_at")
      .in("property_id", properties.map((p) => p.id));

    const { data: allPendingForScore } = await supabase
      .from("violations")
      .select("property_id")
      .in("property_id", properties.map((p) => p.id))
      .eq("user_resolution_status", "pending_verification");

    const { data: allOverdueReminders } = await supabase
      .from("violation_reminders")
      .select("violation_id")
      .eq("is_active", true)
      .lt("deadline_date", new Date().toISOString().split("T")[0]);

    const overdueViolationIds = new Set((allOverdueReminders ?? []).map((r) => r.violation_id));

    const { data: allViolationsForOverdue } = overdueViolationIds.size > 0
      ? await supabase
          .from("violations")
          .select("id, property_id")
          .in("id", Array.from(overdueViolationIds))
      : { data: [] };

    const { data: allViolationsForTotal } = await supabase
      .from("violations")
      .select("property_id, violation_status, violation_date, violation_description, violation_code, inspection_category, user_resolution_status, first_seen_at")
      .in("property_id", properties.map((p) => p.id));

    for (const p of properties) {
      const propResolutions = (allResolutionsForScore ?? []).filter((r) => r.property_id === p.id);
      const propPending = (allPendingForScore ?? []).filter((v) => v.property_id === p.id);
      const propOverdue = (allViolationsForOverdue ?? []).filter((v) => v.property_id === p.id);

      const propViolationObjects = (allViolationsForTotal ?? [])
        .filter((v) => v.property_id === p.id)
        .map((v) => ({
          violation_description: v.violation_description ?? null,
          violation_code: v.violation_code ?? null,
          inspection_category: v.inspection_category ?? null,
          violation_status: v.violation_status ?? null,
          violation_date: v.violation_date ?? null,
          user_resolution_status: v.user_resolution_status ?? null,
        }));

      let fastResolutions = 0;
      for (const r of propResolutions) {
        if (r.fix_date && r.created_at) {
          const daysDiff = (new Date(r.fix_date).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 14) fastResolutions++;
        }
      }

      const result = calculateComplianceScore({
        violations: propViolationObjects,
        resolvedCount: propResolutions.length,
        pendingVerificationCount: propPending.length,
        overdueDeadlines: propOverdue.length,
        fastResolutions,
        recurringIssues: propResolutions.filter((r) => r.is_recurring === "Ongoing problem").length,
        deadlinesMet: propResolutions.filter((r) => r.deadline_met === true).length,
        deadlinesMissed: propResolutions.filter((r) => r.deadline_met === false).length,
      });

      scoresByProperty[p.id] = { score: result.score, grade: result.grade, gradeColor: result.gradeColor };
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
          portfolioStats={{
            totalProperties: properties?.length ?? 0,
            totalOpenViolations,
            totalComplaints,
            totalPendingVerification,
            totalResolved,
            totalSpendMin,
            totalSpendMax,
          }}
          newViolationsByProperty={newViolationsByProperty}
          overdueByProperty={overdueByProperty}
          resolutionsByProperty={resolutionsByProperty}
          scoresByProperty={scoresByProperty}
          userPlan={userPlan}
        />
      </main>
    </div>
  );
}
