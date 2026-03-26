"use server";

/**
 * REMINDER: Run in Supabase SQL Editor before using enrichment:
 * ALTER TABLE public.property_details ADD COLUMN IF NOT EXISTS square_footage NUMERIC, ADD COLUMN IF NOT EXISTS assessed_value NUMERIC;
 * ALTER TABLE public.property_details ADD COLUMN IF NOT EXISTS bedrooms NUMERIC, ADD COLUMN IF NOT EXISTS bathrooms NUMERIC, ADD COLUMN IF NOT EXISTS stories NUMERIC, ADD COLUMN IF NOT EXISTS exterior_condition TEXT;
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyDetails, checkChicagoAddressInPermits, checkPhiladelphiaAddressInOPA } from "@/lib/property-enrichment";
import { validateChicagoAddress, fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { validatePhiladelphiaAddress, fetchPhiladelphiaViolationsForProperty } from "@/lib/philadelphia-violations";
import { canAddProperty, type PlanTier } from "@/lib/plans";
import { revalidatePath } from "next/cache";
import { logComplianceEvent, logComplianceEventBatch } from "@/lib/compliance-events";
import { logAnalyticsEvent } from "@/lib/analytics-events";

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? undefined;

export type PropertyDetailsEnrichment = {
  year_built: number | null;
  property_type: string | null;
  square_footage: number | null;
  units: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  stories?: number | null;
  exterior_condition?: string | null;
  interior_condition?: string | null;
  market_value?: number | null;
  sale_price?: number | null;
  sale_date?: string | null;
  building_description?: string | null;
  central_air?: boolean | null;
  garage_spaces?: number | null;
  quality_grade?: string | null;
  zoning?: string | null;
};

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
      propertyDetails: PropertyDetailsEnrichment | null;
      /** Shown when address was not found in city property records (permits/OPA). */
      warning?: string | null;
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

  if (citySlug !== "chicago" && citySlug !== "philadelphia") {
    return { success: false, error: "Unsupported city." };
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

  const { data: city } = await supabase
    .from("cities")
    .select("id, name")
    .eq("slug", citySlug)
    .single();
  if (!city) {
    return { success: false, error: "City not found." };
  }

  let propertyGroup: string | null = null;
  let normalizedAddress = address.trim().toUpperCase();
  let allRows: Array<{
    id: string;
    violation_date?: string | null;
    violation_code?: string | null;
    violation_description?: string | null;
    violation_status?: string | null;
    violation_status_date?: string | null;
    violation_inspector_comments?: string | null;
    violation_ordinance?: string | null;
    inspector_id?: string | null;
    inspection_number?: string | null;
    inspection_category?: string | null;
    inspection_status?: string | null;
    address?: string | null;
    property_group?: string | null;
  }> = [];

  let warning: string | null = null;

  if (citySlug === "chicago") {
    const foundInPermits = await checkChicagoAddressInPermits(address.trim());
    if (!foundInPermits) {
      warning =
        "This address wasn't found in Chicago property records. You can still add it and we'll monitor for violations.";
    }
    const validation = await validateChicagoAddress(address.trim(), {
      appToken: APP_TOKEN,
    });
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    propertyGroup = validation.propertyGroup ?? null;
    allRows = await fetchChicagoViolationsForProperty(
      address.trim(),
      propertyGroup,
      { appToken: APP_TOKEN }
    );
  } else if (citySlug === "philadelphia") {
    const foundInOPA = await checkPhiladelphiaAddressInOPA(address.trim());
    if (!foundInOPA) {
      warning =
        "This address wasn't found in Philadelphia property records. You can still add it and we'll monitor for violations.";
    }
    const validation = await validatePhiladelphiaAddress(address.trim());
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    propertyGroup = validation.propertyGroup ?? null;
    allRows = await fetchPhiladelphiaViolationsForProperty(address.trim());
  }

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

  await logComplianceEvent({
    propertyId: newProperty.id,
    userId: user.id,
    eventType: "property_added",
    eventData: { description: `Added ${address.trim()} in ${city.name}` },
  });

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
    inspector_id: row.inspector_id ?? null,
    inspection_number: row.inspection_number ?? null,
    inspection_category: row.inspection_category ?? null,
    inspection_status: row.inspection_status ?? null,
    address: row.address ?? null,
    property_group: row.property_group ?? null,
    needs_alert: false,
    first_seen_at: new Date().toISOString(),
    source_dataset: citySlug === "philadelphia" ? "philadelphia" : "building",
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

  if (violationsToInsert.length > 0) {
    await logComplianceEventBatch(
      violationsToInsert.slice(0, 100).map((v) => ({
        propertyId: newProperty.id,
        userId: user.id,
        eventType: "violation_detected" as const,
        eventData: {
          violation_code: v.violation_code ?? undefined,
          violation_description: v.violation_description ?? undefined,
          inspection_category: v.inspection_category ?? undefined,
          violation_date: v.violation_date ?? undefined,
          description: "Found during baseline scan",
        },
      }))
    );

    await logComplianceEvent({
      propertyId: newProperty.id,
      userId: user.id,
      eventType: "baseline_scan_completed",
      eventData: {
        violations_found: allRows.length,
        new_violations: allRows.length,
        description: `Baseline scan: ${openCount} open, ${closedCount} closed`,
      },
    });
  }

  await supabase
    .from("properties")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("id", newProperty.id);

  try {
    const admin = createAdminClient();
    await admin
      .from("address_searches")
      .update({ property_added: true })
      .eq("user_id", user.id)
      .eq("address", address.trim())
      .eq("city", citySlug)
      .eq("property_added", false);
  } catch (e) {
    console.error("[onboarding] address_searches update", e);
  }

  let propertyDetails: PropertyDetailsEnrichment | null = null;
  try {
    const enrichment = await getPropertyDetails(address.trim(), citySlug);
    if (enrichment) {
      const admin = createAdminClient();
      const { error: enrichUpsertErr } = await admin.from("property_details").upsert(
        {
          property_id: newProperty.id,
          property_type: enrichment.property_type ?? null,
          unit_count: enrichment.units != null ? Math.round(enrichment.units) : null,
          year_built: enrichment.year_built != null ? Math.round(enrichment.year_built) : null,
          square_footage: enrichment.square_footage ?? null,
          bedrooms: enrichment.bedrooms ?? null,
          bathrooms: enrichment.bathrooms != null ? Math.round(enrichment.bathrooms) : null,
          stories: enrichment.stories ?? null,
          exterior_condition: enrichment.exterior_condition ?? null,
          interior_condition: enrichment.interior_condition ?? null,
          market_value: enrichment.market_value ?? null,
          sale_price: enrichment.sale_price ?? null,
          sale_date: enrichment.sale_date ?? null,
          building_description: enrichment.building_description ?? null,
          central_air: enrichment.central_air ?? null,
          garage_spaces: enrichment.garage_spaces ?? null,
          quality_grade: enrichment.quality_grade ?? null,
          zoning: enrichment.zoning ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id" }
      );
      if (enrichUpsertErr) {
        console.error("[onboarding] enrichment upsert error:", enrichUpsertErr.message);
      }
      if (!enrichUpsertErr) {
        await logComplianceEvent({
          propertyId: newProperty.id,
          userId: user.id,
          eventType: "property_enriched",
          eventData: {
            enrichment_source: citySlug,
            fields_updated: Object.entries(enrichment)
              .filter(([, v]) => v != null)
              .map(([k]) => k),
          },
        });
      }
      propertyDetails = enrichment;
    }
  } catch (e) {
    console.error("[onboarding] enrichment", e);
  }

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

  if (allRows.length === 0) {
    const noViolationsNote =
      "No existing violations found — we'll start monitoring this address for any new filings.";
    warning = warning ? `${warning} ${noViolationsNote}` : noViolationsNote;
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  await logAnalyticsEvent({
    userId: user.id,
    eventType: "onboarding_completed",
    propertyId: newProperty.id,
    eventData: {
      city: citySlug,
      address: address.trim(),
      violations_found: allRows.length,
    },
  });

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
    propertyDetails,
    warning: warning ?? null,
  };
}
