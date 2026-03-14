import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      property_type,
      management_type,
      approximate_rent,
      last_inspected,
      surprised_by_violation,
      biggest_concerns,
      referral_source,
    } = body as {
      propertyId?: string;
      property_type?: string | null;
      management_type?: string | null;
      approximate_rent?: string | null;
      last_inspected?: string | null;
      surprised_by_violation?: string | null;
      biggest_concerns?: string[] | null;
      referral_source?: string | null;
    };

    const admin = createAdminClient();

    const hasPropertyData =
      property_type != null ||
      management_type != null ||
      approximate_rent != null ||
      last_inspected != null ||
      surprised_by_violation != null;

    if (propertyId && hasPropertyData) {
      const { error: detailErr } = await admin.from("property_details").upsert(
        {
          property_id: propertyId,
          property_type: property_type ?? null,
          management_type: management_type ?? null,
          approximate_rent: approximate_rent ?? null,
          last_inspected: last_inspected ?? null,
          surprised_by_violation: surprised_by_violation ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id" }
      );
      if (detailErr) {
        console.error("[questionnaire] property_details upsert", detailErr);
        return NextResponse.json({ error: detailErr.message }, { status: 500 });
      }
    }

    if (biggest_concerns != null || referral_source != null) {
      const updates: Record<string, unknown> = {};
      if (biggest_concerns !== undefined) updates.biggest_concerns = biggest_concerns;
      if (referral_source !== undefined) updates.referral_source = referral_source;

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[questionnaire]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
