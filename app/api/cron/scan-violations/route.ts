import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { fetchPhiladelphiaViolationsForProperty } from "@/lib/philadelphia-violations";

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? undefined;

type LogEntry = {
  propertyId: string;
  address: string;
  citySlug: string;
  fetched: number;
  newCount: number;
  error?: string;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const logs: LogEntry[] = [];
  let totalNew = 0;

  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug");
  const cityBySlug = new Map((cities ?? []).map((c) => [c.slug, c.id]));

  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select("id, city_id, address, normalized_address, property_group");
  if (propError) {
    console.error("[cron/scan-violations] properties fetch", propError);
    return NextResponse.json(
      { error: propError.message, logs },
      { status: 500 }
    );
  }
  const cityIdToSlug = new Map(
    (cities ?? []).map((c) => [c.id, c.slug])
  );

  for (const prop of properties ?? []) {
    const citySlug = cityIdToSlug.get(prop.city_id) ?? "";
    let rows: Array<{
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

    if (citySlug === "chicago") {
      try {
        rows = await fetchChicagoViolationsForProperty(
          prop.address,
          prop.property_group,
          { appToken: APP_TOKEN }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[cron/scan-violations] property", prop.id, message);
        logs.push({
          propertyId: prop.id,
          address: prop.address,
          citySlug,
          fetched: 0,
          newCount: 0,
          error: message,
        });
        continue;
      }
    } else if (citySlug === "philadelphia") {
      try {
        rows = await fetchPhiladelphiaViolationsForProperty(prop.address);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[cron/scan-violations] property", prop.id, message);
        logs.push({
          propertyId: prop.id,
          address: prop.address,
          citySlug,
          fetched: 0,
          newCount: 0,
          error: message,
        });
        continue;
      }
    } else {
      logs.push({
        propertyId: prop.id,
        address: prop.address,
        citySlug,
        fetched: 0,
        newCount: 0,
        error: "City not supported for scan",
      });
      continue;
    }

    try {

      const { data: existing } = await supabase
        .from("violations")
        .select("external_id")
        .eq("property_id", prop.id);
      const existingIds = new Set((existing ?? []).map((r) => r.external_id));

      const toInsert: Array<{
        property_id: string;
        city_id: string;
        external_id: string;
        violation_date: string | null;
        violation_code: string | null;
        violation_description: string | null;
        violation_status: string | null;
        violation_status_date: string | null;
        violation_inspector_comments: string | null;
        violation_ordinance: string | null;
        inspector_id: string | null;
        inspection_number: string | null;
        inspection_category: string | null;
        inspection_status: string | null;
        address: string | null;
        property_group: string | null;
        needs_alert: boolean;
        first_seen_at: string;
        source_dataset: string;
      }> = [];
      for (const row of rows) {
        if (!existingIds.has(row.id)) {
          toInsert.push({
            property_id: prop.id,
            city_id: prop.city_id,
            external_id: row.id,
            violation_date: row.violation_date
              ? new Date(row.violation_date).toISOString()
              : null,
            violation_code: row.violation_code ?? null,
            violation_description: row.violation_description ?? null,
            violation_status: row.violation_status ?? null,
            violation_status_date: row.violation_status_date
              ? new Date(row.violation_status_date).toISOString()
              : null,
            violation_inspector_comments: row.violation_inspector_comments ?? null,
            violation_ordinance: row.violation_ordinance ?? null,
            inspector_id: row.inspector_id ?? null,
            inspection_number: row.inspection_number ?? null,
            inspection_category: row.inspection_category ?? null,
            inspection_status: row.inspection_status ?? null,
            address: row.address ?? null,
            property_group: row.property_group ?? null,
            needs_alert: true,
            first_seen_at: new Date().toISOString(),
            source_dataset: citySlug === "philadelphia" ? "philadelphia" : "building",
          });
          existingIds.add(row.id);
        }
      }

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from("violations")
          .insert(toInsert);
        if (insertErr) {
          logs.push({
            propertyId: prop.id,
            address: prop.address,
            citySlug,
            fetched: rows.length,
            newCount: 0,
            error: insertErr.message,
          });
        } else {
          totalNew += toInsert.length;
          logs.push({
            propertyId: prop.id,
            address: prop.address,
            citySlug,
            fetched: rows.length,
            newCount: toInsert.length,
          });
        }
      } else {
        logs.push({
          propertyId: prop.id,
          address: prop.address,
          citySlug,
          fetched: rows.length,
          newCount: 0,
        });
      }

      await supabase
        .from("properties")
        .update({ last_scanned_at: new Date().toISOString() })
        .eq("id", prop.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[cron/scan-violations] property", prop.id, message);
      logs.push({
        propertyId: prop.id,
        address: prop.address,
        citySlug,
        fetched: 0,
        newCount: 0,
        error: message,
      });
    }
  }

  console.log("[cron/scan-violations] done", {
    properties: properties?.length ?? 0,
    totalNewViolations: totalNew,
    logs: logs.length,
  });
  return NextResponse.json({
    ok: true,
    propertiesScanned: properties?.length ?? 0,
    newViolationsInserted: totalNew,
    logs,
  });
}
