import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAnalyticsEvent } from "@/lib/analytics-events";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      propertyId,
      unit_count,
      ownership_role,
      property_type,
      management_type,
      property_management_company,
      approximate_rent,
      occupied_status,
      acquisition_year,
      acquisition_method,
      last_inspected,
      surprised_by_violation,
      has_preferred_contractor,
      preferred_contractor_name,
      biggest_concerns,
      referral_source,
      total_properties_owned,
    } = body as {
      propertyId?: string;
      unit_count?: number | null;
      ownership_role?: string | null;
      property_type?: string | null;
      management_type?: string | null;
      property_management_company?: string | null;
      approximate_rent?: string | null;
      occupied_status?: string | null;
      acquisition_year?: number | null;
      acquisition_method?: string | null;
      last_inspected?: string | null;
      surprised_by_violation?: string | null;
      has_preferred_contractor?: boolean | null;
      preferred_contractor_name?: string | null;
      biggest_concerns?: string[] | null;
      referral_source?: string | null;
      total_properties_owned?: string | null;
    };

    const admin = createAdminClient();

    const hasPropertyData =
      unit_count != null ||
      ownership_role != null ||
      property_type != null ||
      management_type != null ||
      approximate_rent != null ||
      occupied_status != null ||
      acquisition_year != null ||
      acquisition_method != null ||
      last_inspected != null ||
      surprised_by_violation != null ||
      has_preferred_contractor != null;

    if (propertyId && hasPropertyData) {
      const { error: detailErr } = await admin.from("property_details").upsert(
        {
          property_id: propertyId,
          unit_count: unit_count != null ? Math.round(Number(unit_count)) : undefined,
          ownership_role: ownership_role ?? null,
          property_type: property_type ?? null,
          management_type: management_type ?? null,
          approximate_rent: approximate_rent ?? null,
          occupied_status: occupied_status ?? null,
          acquisition_year: acquisition_year ?? null,
          acquisition_method: acquisition_method ?? null,
          last_inspected: last_inspected ?? null,
          surprised_by_violation: surprised_by_violation ?? null,
          has_preferred_contractor: has_preferred_contractor ?? null,
          preferred_contractor_name: preferred_contractor_name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id" }
      );
      if (detailErr) {
        console.error("[questionnaire] property_details upsert", detailErr);
        return NextResponse.json({ error: detailErr.message }, { status: 500 });
      }
    }

    if (biggest_concerns != null || referral_source != null || total_properties_owned != null || property_management_company != null) {
      const updates: Record<string, unknown> = {};
      if (biggest_concerns !== undefined) updates.biggest_concerns = biggest_concerns;
      if (referral_source !== undefined) updates.referral_source = referral_source;
      if (total_properties_owned !== undefined) updates.total_properties_owned = total_properties_owned;
      if (property_management_company !== undefined) updates.property_management_company = property_management_company;

      if (Object.keys(updates).length > 0) {
        const { error: profileErr } = await admin
          .from("profiles")
          .update(updates)
          .eq("id", user.id);
        if (profileErr) {
          console.error("[questionnaire] profiles update", profileErr);
          return NextResponse.json({ error: profileErr.message }, { status: 500 });
        }
      }
    }

    await logAnalyticsEvent({
      userId: user.id,
      eventType: "questionnaire_submitted",
      propertyId: propertyId ?? null,
      eventData: {
        fields_completed: Object.entries(body).filter(([, v]) => v != null && v !== "" && v !== false).map(([k]) => k),
        total_fields_completed: Object.entries(body).filter(([, v]) => v != null && v !== "" && v !== false).length,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[questionnaire]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
