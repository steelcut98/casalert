import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPropertyDetails } from "@/lib/property-enrichment";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, address, city_id")
    .is("latitude", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cityIds = [...new Set((properties ?? []).map(p => p.city_id))];
  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug")
    .in("id", cityIds);
  const cityMap = new Map((cities ?? []).map(c => [c.id, c.slug]));

  let updated = 0;
  for (const prop of properties ?? []) {
    const citySlug = cityMap.get(prop.city_id);
    if (!citySlug) continue;

    try {
      const details = await getPropertyDetails(prop.address, citySlug);
      if (!details) continue;

      const updates: Record<string, unknown> = {};
      if (details.latitude) updates.latitude = details.latitude;
      if (details.longitude) updates.longitude = details.longitude;
      if (details.zip_code) updates.zip_code = details.zip_code;

      if (Object.keys(updates).length > 0) {
        await supabase.from("properties").update(updates).eq("id", prop.id);
      }

      if (details.parcel_id) {
        await supabase.from("property_details").update({ parcel_id: details.parcel_id }).eq("property_id", prop.id);
      }

      updated++;
    } catch {
      // Skip failures silently
    }
  }

  return NextResponse.json({ total: properties?.length ?? 0, updated });
}
