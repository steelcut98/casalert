import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyDetails } from "@/lib/property-enrichment";

type PropertyRow = {
  id: string;
  address: string;
  city_id: string;
};

function keepNum(v: number | null | undefined): number | null {
  if (v == null || v === 0) return null;
  return Number.isFinite(v) ? v : null;
}

function keepStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function mapConditionCode(code: unknown): string | null {
  if (code == null) return null;
  const s = String(code).trim();
  if (s.length === 0) return null;
  const numericMap: Record<string, string> = {
    "2": "New / Rehabbed",
    "3": "Above Average",
    "4": "Average",
    "5": "Below Average",
    "6": "Vacant",
    "7": "Sealed / Compromised",
  };
  if (numericMap[s]) return numericMap[s];
  if (s === "0" || s === "1") return null;
  const validLabels = new Set([
    "New / Rehabbed", "Above Average", "Average",
    "Below Average", "Vacant", "Sealed / Compromised",
  ]);
  if (validLabels.has(s)) return s;
  return null;
}

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { propertyId } = (await request.json().catch(() => ({}))) as { propertyId?: string };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    let query = admin
      .from("properties")
      .select("id, address, city_id")
      .eq("user_id", user.id);
    if (propertyId) {
      query = query.eq("id", propertyId);
    }
    const { data: properties, error: propErr } = await query;
    if (propErr) {
      return NextResponse.json({ error: propErr.message }, { status: 500 });
    }

    const cityIds = Array.from(new Set((properties ?? []).map((p) => p.city_id)));
    const { data: cities, error: cityErr } = cityIds.length
      ? await admin.from("cities").select("id, slug").in("id", cityIds)
      : { data: [], error: null };
    if (cityErr) {
      return NextResponse.json({ error: cityErr.message }, { status: 500 });
    }
    const cityById = new Map((cities ?? []).map((c) => [c.id, c.slug]));
    console.log("[Re-enrich] Properties found:", properties?.length);
    console.log("[Re-enrich] City map:", Object.fromEntries(cityById));

    let enriched = 0;
    let failed = 0;

    for (const property of (properties ?? []) as PropertyRow[]) {
      try {
        const citySlug = cityById.get(property.city_id);
        if (!citySlug) {
          failed++;
          continue;
        }
        console.log("[Re-enrich] Processing:", property.address, "city slug:", citySlug);
        const details = await getPropertyDetails(property.address, citySlug);
        console.log("[Re-enrich] Details result:", details ? "got data" : "null");
        if (!details) {
          failed++;
          continue;
        }

        const payload: Record<string, unknown> = {
          property_id: property.id,
          updated_at: new Date().toISOString(),
        };

        // Shared values
        const yearBuilt = keepNum(details.year_built);
        const propertyType = keepStr(details.property_type);
        const squareFootage = keepNum(details.square_footage);
        if (yearBuilt != null) payload.year_built = Math.round(yearBuilt);
        if (propertyType != null) payload.property_type = propertyType;
        if (squareFootage != null) payload.square_footage = squareFootage;

        const unitCount = keepNum(details.units);
        const bedrooms = keepNum(details.bedrooms);
        const bathrooms = keepNum(details.bathrooms);
        const stories = keepNum(details.stories);
        if (unitCount != null) payload.unit_count = Math.round(unitCount);
        if (bedrooms != null) payload.bedrooms = bedrooms;
        if (bathrooms != null) payload.bathrooms = Math.round(bathrooms);
        if (stories != null) payload.stories = stories;
        payload.exterior_condition = details.exterior_condition ?? null;
        payload.interior_condition = details.interior_condition ?? null;
        payload.market_value = details.market_value ?? null;
        payload.sale_price = details.sale_price ?? null;
        payload.sale_date = details.sale_date ?? null;
        payload.building_description = details.building_description ?? null;
        payload.central_air = details.central_air ?? null;
        payload.garage_spaces = details.garage_spaces ?? null;
        payload.quality_grade = details.quality_grade ?? null;
        payload.zoning = details.zoning ?? null;
        if (details.parcel_id) payload.parcel_id = details.parcel_id;

        const keys = Object.keys(payload);
        if (keys.length <= 2) {
          failed++;
          continue;
        }

        const { error: upsertErr } = await admin
          .from("property_details")
          .upsert(payload, { onConflict: "property_id" });
        if (upsertErr) {
          console.error("[Re-enrich] Upsert error for", property.address, ":", upsertErr.message, "Payload keys:", Object.keys(payload));
          failed++;
          continue;
        }
        if (details.zip_code || details.latitude || details.longitude) {
          const geoUpdate: Record<string, unknown> = {};
          if (details.zip_code) geoUpdate.zip_code = details.zip_code;
          if (details.latitude) geoUpdate.latitude = details.latitude;
          if (details.longitude) geoUpdate.longitude = details.longitude;
          if (Object.keys(geoUpdate).length > 0) {
            await admin.from("properties").update(geoUpdate).eq("id", property.id);
          }
        }

        enriched++;
      } catch (error) {
        console.error("[Re-enrich] Error for property:", property.address, error);
        failed++;
      }
    }

    return NextResponse.json({ enriched, failed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
