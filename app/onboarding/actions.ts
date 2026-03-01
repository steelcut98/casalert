"use server";

import { createClient } from "@/lib/supabase/server";
import { validateChicagoAddress, fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { canAddProperty, type PlanTier } from "@/lib/plans";
import { revalidatePath } from "next/cache";

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? undefined;

export type OnboardingResult =
  | {
      success: true;
      propertyId: string;
      address: string;
      cityName: string;
      propertyGroup: string | null;
      totalViolations: number;
      openCount: number;
      closedCount: number;
      byCategory: Record<string, number>;
      mostRecentDate: string | null;
      violations: Array<{
        id: string;
        violation_date: string | null;
        violation_code: string | null;
        violation_description: string | null;
        violation_status: string | null;
        inspection_category: string | null;
        address: string | null;
      }>;
    }
  | { success: false; error: string };

export async function addPropertyWithBaselineScan(
  citySlug: string,
  address: string
): Promise<OnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  if (citySlug !== "chicago") {
    return { success: false, error: "Only Chicago is supported at this time." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = (profile?.plan ?? "free") as PlanTier;

  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("user_id", user.id);
  const currentCount = existing?.length ?? 0;
  if (!canAddProperty(plan, currentCount)) {
    return {
      success: false,
      error: "Property limit reached for your plan. Upgrade to add more properties.",
    };
  }

  const validation = await validateChicagoAddress(address.trim(), {
    appToken: APP_TOKEN,
  });
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { data: city } = await supabase
    .from("cities")
    .select("id, name")
    .eq("slug", citySlug)
    .single();
  if (!city) {
    return { success: false, error: "City not found." };
  }

  const normalizedAddress = address.trim().toUpperCase();
  const propertyGroup = validation.propertyGroup ?? null;

  const { data: newProperty, error: insertPropError } = await supabase
    .from("properties")
    .insert({
      user_id: user.id,
      city_id: city.id,
      address: address.trim(),
      normalized_address: normalizedAddress,
      property_group: propertyGroup,
    })
    .select("id")
    .single();

  if (insertPropError || !newProperty) {
    if (insertPropError?.code === "23505") {
      return { success: false, error: "This address is already in your list." };
    }
    return {
      success: false,
      error: insertPropError?.message ?? "Failed to save property.",
    };
  }

  const allRows = await fetchChicagoViolationsForProperty(
    address.trim(),
    propertyGroup,
    { appToken: APP_TOKEN }
  );

  const openStatus = "OPEN";
  let openCount = 0;
  let closedCount = 0;
  const byCategory: Record<string, number> = {};

  for (const row of allRows) {
    if ((row.violation_status ?? "").toUpperCase() === openStatus) {
      openCount++;
    } else {
      closedCount++;
    }
    const cat = row.inspection_category ?? "Unknown";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  const violationsToInsert = allRows.map((row) => ({
    property_id: newProperty.id,
    city_id: city.id,
    external_id: row.id,
    violation_date: row.violation_date ? new Date(row.violation_date).toISOString() : null,
    violation_code: row.violation_code ?? null,
    violation_description: row.violation_description ?? null,
    violation_status: row.violation_status ?? null,
    violation_status_date: row.violation_status_date ? new Date(row.violation_status_date).toISOString() : null,
    violation_inspector_comments: row.violation_inspector_comments ?? null,
    violation_ordinance: row.violation_ordinance ?? null,
    inspection_number: row.inspection_number ?? null,
    inspection_category: row.inspection_category ?? null,
    inspection_status: row.inspection_status ?? null,
    address: row.address ?? null,
    property_group: row.property_group ?? null,
    needs_alert: false,
    first_seen_at: new Date().toISOString(),
    source_dataset: "building",
  }));

  if (violationsToInsert.length > 0) {
    const { error: insertViolError } = await supabase
      .from("violations")
      .upsert(violationsToInsert, {
        onConflict: "property_id,external_id",
        ignoreDuplicates: true,
      });
    if (insertViolError) {
      console.error("[onboarding] Violations insert error", insertViolError);
    }
  }

  await supabase
    .from("properties")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("id", newProperty.id);

  const mostRecent = allRows[0]?.violation_date ?? null;
  const reportViolations = allRows.slice(0, 500).map((row) => ({
    id: row.id,
    violation_date: row.violation_date ?? null,
    violation_code: row.violation_code ?? null,
    violation_description: row.violation_description ?? null,
    violation_status: row.violation_status ?? null,
    inspection_category: row.inspection_category ?? null,
    address: row.address ?? null,
  }));

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return {
    success: true,
    propertyId: newProperty.id,
    address: address.trim(),
    cityName: city.name,
    propertyGroup,
    totalViolations: allRows.length,
    openCount,
    closedCount,
    byCategory,
    mostRecentDate: mostRecent,
    violations: reportViolations,
  };
}
