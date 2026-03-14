import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirectTo=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, total_properties_owned, biggest_concerns, referral_source")
    .eq("id", user.id)
    .single();
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", user.id);
  const propertyCount = properties?.length ?? 0;
  const plan = profile?.plan ?? "free";
  const canAdd =
    plan === "pro" ? true : plan === "starter" ? propertyCount < 5 : propertyCount < 1;
  const hasUserQuestionnaireData = !!(
    (profile?.total_properties_owned ?? "").trim() ||
    (profile?.referral_source ?? "").trim() ||
    (Array.isArray(profile?.biggest_concerns) && profile.biggest_concerns.length > 0)
  );
  const showUserQuestions = propertyCount === 0 && !hasUserQuestionnaireData;

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
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Add a property
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          We’ll validate the address against Chicago building records and run a
          baseline scan of all violations.
        </p>

        <OnboardingForm
          canAddProperty={canAdd}
          plan={plan}
          currentCount={propertyCount}
          showUserQuestions={showUserQuestions}
        />
      </main>
    </div>
  );
}
