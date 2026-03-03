import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { fetchPhiladelphiaViolationsForProperty } from "@/lib/philadelphia-violations";
import { sendNewViolationEmail, sendReminderEmail } from "@/lib/email-alerts";
import { sendNewViolationSMS, sendReminderSMS } from "@/lib/sms-alerts";

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

  function violationTypeFromCategory(category: string | null | undefined) {
    const c = (category ?? "").toUpperCase();
    if (c.includes("COMPLAINT")) return "COMPLAINT";
    if (c.includes("PERIODIC")) return "PERIODIC";
    if (c.includes("REGISTRATION")) return "REGISTRATION";
    if (c.includes("PERMIT")) return "PERMIT";
    return "OTHER";
  }

  function daysBetweenTodayAndDate(dateOnly: string) {
    const parts = dateOnly.split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    const deadlineUtc = Date.UTC(y, (m || 1) - 1, d || 1);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.ceil((deadlineUtc - todayUtc) / (1000 * 60 * 60 * 24));
  }

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

  // ----------------------------------------------------------------------------
  // Alert-sending phase: new violations (needs_alert = true)
  // ----------------------------------------------------------------------------
  try {
    const { data: needsAlertRows, error: needsAlertErr } = await supabase
      .from("violations")
      .select("property_id")
      .eq("needs_alert", true);

    if (needsAlertErr) {
      console.error("[cron/scan-violations] needs_alert lookup error", needsAlertErr);
    } else {
      const propertyIds = [
        ...new Set((needsAlertRows ?? []).map((r) => r.property_id)),
      ];

      for (const propertyId of propertyIds) {
        const { data: property } = await supabase
          .from("properties")
          .select("id, address, user_id, city_id")
          .eq("id", propertyId)
          .single();
        if (!property) continue;

        const citySlug = cityIdToSlug.get(property.city_id) ?? "";

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "id, email, phone, plan, email_alerts_enabled, sms_alerts_enabled, alert_complaint, alert_periodic, alert_registration, alert_permit"
          )
          .eq("id", property.user_id)
          .single();
        if (!profile) continue;

        const { data: pending } = await supabase
          .from("violations")
          .select(
            "id, inspection_category, violation_date, violation_code, violation_description, violation_status, needs_alert"
          )
          .eq("property_id", propertyId)
          .eq("needs_alert", true);

        const filtered = (pending ?? []).filter((v) => {
          const t = violationTypeFromCategory(v.inspection_category);
          if (t === "COMPLAINT") return profile.alert_complaint !== false;
          if (t === "PERIODIC") return profile.alert_periodic !== false;
          if (t === "REGISTRATION") return profile.alert_registration !== false;
          if (t === "PERMIT") return profile.alert_permit !== false;
          return false;
        });

        const complaintCount = filtered.filter(
          (v) => violationTypeFromCategory(v.inspection_category) === "COMPLAINT"
        ).length;

        if (filtered.length > 0 && profile.email_alerts_enabled) {
          try {
            const r = await sendNewViolationEmail(
              profile.email,
              property.address,
              property.id,
              filtered,
              citySlug
            );
            console.log("[cron/scan-violations] email new-violations", {
              propertyId,
              to: profile.email,
              success: r.success,
              error: r.error,
              count: filtered.length,
            });
          } catch (err) {
            console.log("[cron/scan-violations] email new-violations exception", {
              propertyId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const phone = (profile.phone ?? "").trim();
        const isPaid = profile.plan !== "free";
        if (
          filtered.length > 0 &&
          profile.sms_alerts_enabled &&
          isPaid &&
          phone.length > 0
        ) {
          try {
            const r = await sendNewViolationSMS(
              phone,
              property.address,
              filtered.length,
              complaintCount,
              property.id
            );
            console.log("[cron/scan-violations] sms new-violations", {
              propertyId,
              to: phone,
              success: r.success,
              error: r.error,
              count: filtered.length,
            });
          } catch (err) {
            console.log("[cron/scan-violations] sms new-violations exception", {
              propertyId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const { error: clearErr } = await supabase
          .from("violations")
          .update({ needs_alert: false })
          .eq("property_id", propertyId)
          .eq("needs_alert", true);
        if (clearErr) {
          console.error("[cron/scan-violations] clear needs_alert error", {
            propertyId,
            error: clearErr.message,
          });
        }
      }
    }
  } catch (err) {
    console.error(
      "[cron/scan-violations] new violation alert phase error",
      err
    );
  }

  // ----------------------------------------------------------------------------
  // Reminder phase: due reminders (next_reminder_at <= now and is_active = true)
  // ----------------------------------------------------------------------------
  try {
    const { data: dueReminders, error: dueErr } = await supabase
      .from("violation_reminders")
      .select("id, violation_id, user_id, deadline_date, reminder_frequency")
      .eq("is_active", true)
      .not("next_reminder_at", "is", null)
      .lte("next_reminder_at", new Date().toISOString());

    if (dueErr) {
      console.error("[cron/scan-violations] due reminders query error", dueErr);
    } else {
      for (const r of dueReminders ?? []) {
        const { data: violation } = await supabase
          .from("violations")
          .select(
            "id, property_id, violation_description, violation_code, inspection_category"
          )
          .eq("id", r.violation_id)
          .single();
        if (!violation) continue;

        const { data: property } = await supabase
          .from("properties")
          .select("id, address, city_id, user_id")
          .eq("id", violation.property_id)
          .single();
        if (!property) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "id, email, phone, plan, email_reminders_enabled, sms_reminders_enabled"
          )
          .eq("id", property.user_id)
          .single();
        if (!profile) continue;

        const deadlineDate = String(r.deadline_date);
        const daysRemaining = daysBetweenTodayAndDate(deadlineDate);
        const phone = (profile.phone ?? "").trim();
        const isPaid = profile.plan !== "free";

        if (profile.email_reminders_enabled) {
          try {
            const out = await sendReminderEmail(
              profile.email,
              property.address,
              property.id,
              violation.violation_description ?? "Violation reminder",
              violation.violation_code ?? "",
              deadlineDate,
              daysRemaining
            );
            console.log("[cron/scan-violations] email reminder", {
              reminderId: r.id,
              to: profile.email,
              success: out.success,
              error: out.error,
            });
          } catch (err) {
            console.log("[cron/scan-violations] email reminder exception", {
              reminderId: r.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (profile.sms_reminders_enabled && isPaid && phone.length > 0) {
          try {
            const out = await sendReminderSMS(
              phone,
              property.address,
              violation.violation_description ?? "Violation reminder",
              deadlineDate,
              daysRemaining
            );
            console.log("[cron/scan-violations] sms reminder", {
              reminderId: r.id,
              to: phone,
              success: out.success,
              error: out.error,
            });
          } catch (err) {
            console.log("[cron/scan-violations] sms reminder exception", {
              reminderId: r.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const freq = String(r.reminder_frequency);
        const isOneOff =
          freq === "10_days_before" ||
          freq === "3_days_before" ||
          freq === "1_day_before";

        if (isOneOff) {
          const deactivate = daysRemaining < 0 ? true : true;
          const { error: updErr } = await supabase
            .from("violation_reminders")
            .update({
              is_active: deactivate ? false : false,
              next_reminder_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          if (updErr) {
            console.error("[cron/scan-violations] reminder update error", {
              reminderId: r.id,
              error: updErr.message,
            });
          }
          continue;
        }

        if (freq === "every_3_days" || freq === "every_week") {
          const next = new Date();
          next.setDate(next.getDate() + (freq === "every_week" ? 7 : 3));
          const { error: updErr } = await supabase
            .from("violation_reminders")
            .update({
              next_reminder_at: next.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", r.id);
          if (updErr) {
            console.error("[cron/scan-violations] reminder reschedule error", {
              reminderId: r.id,
              error: updErr.message,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[cron/scan-violations] reminder phase error", err);
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
