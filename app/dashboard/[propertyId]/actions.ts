"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { fetchPhiladelphiaViolationsForProperty } from "@/lib/philadelphia-violations";
import { logComplianceEvent, logComplianceEventBatch } from "@/lib/compliance-events";
import { getViolationSeverity } from "@/lib/compliance-score";

const APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? undefined;

export type ReminderFrequency =
  | "every_3_days"
  | "every_week"
  | "10_days_before"
  | "3_days_before"
  | "1_day_before";

function computeNextReminderAt(
  deadlineDate: Date,
  frequency: ReminderFrequency
): Date | null {
  const now = new Date();
  if (frequency === "every_3_days") {
    const d = new Date(now);
    d.setDate(d.getDate() + 3);
    return d;
  }
  if (frequency === "every_week") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (frequency === "10_days_before") {
    const d = new Date(deadlineDate);
    d.setDate(d.getDate() - 10);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (frequency === "3_days_before") {
    const d = new Date(deadlineDate);
    d.setDate(d.getDate() - 3);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (frequency === "1_day_before") {
    const d = new Date(deadlineDate);
    d.setDate(d.getDate() - 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  return null;
}

export async function setViolationReminder(
  violationId: string,
  propertyId: string,
  deadlineDateStr: string,
  reminderFrequency: ReminderFrequency
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const deadlineDate = new Date(deadlineDateStr);
  if (Number.isNaN(deadlineDate.getTime()))
    return { error: "Invalid deadline date" };

  const nextAt = computeNextReminderAt(deadlineDate, reminderFrequency);

  const { error } = await supabase.from("violation_reminders").upsert(
    {
      violation_id: violationId,
      user_id: user.id,
      deadline_date: deadlineDateStr.slice(0, 10),
      reminder_frequency: reminderFrequency,
      next_reminder_at: nextAt?.toISOString() ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "violation_id" }
  );

  if (error) return { error: error.message };

  await logComplianceEvent({
    propertyId,
    userId: user.id,
    eventType: "reminder_set",
    violationId: violationId,
    eventData: {
      reminder_date: deadlineDateStr,
      description: `Reminder set: ${reminderFrequency} for deadline ${deadlineDateStr}`,
    },
  });

  revalidatePath(`/dashboard/${propertyId}`);
  return {};
}

export async function clearViolationReminder(
  violationId: string,
  propertyId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("violation_reminders")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("violation_id", violationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await logComplianceEvent({
    propertyId,
    userId: user.id,
    eventType: "reminder_dismissed",
    violationId: violationId,
    eventData: {
      description: "Reminder cleared by user",
    },
  });

  revalidatePath(`/dashboard/${propertyId}`);
  return {};
}

export async function setBulkViolationReminders(
  propertyId: string,
  violationIds: string[],
  deadlineDateStr: string,
  reminderFrequency: ReminderFrequency
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const deadlineDate = new Date(deadlineDateStr);
  if (Number.isNaN(deadlineDate.getTime()))
    return { error: "Invalid deadline date" };

  const nextAt = computeNextReminderAt(deadlineDate, reminderFrequency);
  const dateOnly = deadlineDateStr.slice(0, 10);

  for (const violationId of violationIds) {
    const { error } = await supabase.from("violation_reminders").upsert(
      {
        violation_id: violationId,
        user_id: user.id,
        deadline_date: dateOnly,
        reminder_frequency: reminderFrequency,
        next_reminder_at: nextAt?.toISOString() ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "violation_id" }
    );
    if (error) return { error: error.message };
  }

  await logComplianceEvent({
    propertyId,
    userId: user.id,
    eventType: "reminder_set",
    eventData: {
      reminder_date: deadlineDateStr,
      description: `Bulk reminder set for ${violationIds.length} violations: ${reminderFrequency}`,
    },
  });

  revalidatePath(`/dashboard/${propertyId}`);
  return {};
}

export async function rescanPropertyViolations(
  propertyId: string
): Promise<{ error?: string; count?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: property, error: propErr } = await supabase
    .from("properties")
    .select("id, address, property_group, city_id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();
  if (propErr || !property) return { error: "Property not found" };

  const { data: city } = await supabase
    .from("cities")
    .select("id, slug")
    .eq("id", property.city_id)
    .single();
  if (!city) return { error: "City not found" };

  const { data: existingViolations } = await supabase
    .from("violations")
    .select("external_id, user_resolution_status, user_resolved_at, verification_deadline")
    .eq("property_id", propertyId);

  const resolutionStatusMap = new Map(
    (existingViolations ?? [])
      .filter(v => v.user_resolution_status && v.user_resolution_status !== "open")
      .map(v => [v.external_id, {
        user_resolution_status: v.user_resolution_status,
        user_resolved_at: v.user_resolved_at,
        verification_deadline: v.verification_deadline,
      }])
  );

  const { error: deleteErr } = await supabase
    .from("violations")
    .delete()
    .eq("property_id", propertyId);
  if (deleteErr) return { error: deleteErr.message };

  type RowShape = {
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
  };

  let rows: RowShape[] = [];
  if (city.slug === "philadelphia") {
    rows = await fetchPhiladelphiaViolationsForProperty(property.address);
  } else {
    rows = await fetchChicagoViolationsForProperty(
      property.address,
      property.property_group,
      { appToken: APP_TOKEN }
    );
  }

  const toInsert = rows.map((row) => ({
    property_id: property.id,
    city_id: property.city_id,
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
    source_dataset: city.slug === "philadelphia" ? "philadelphia" : "building",
    user_resolution_status: resolutionStatusMap.get(row.id)?.user_resolution_status ?? "open",
    user_resolved_at: resolutionStatusMap.get(row.id)?.user_resolved_at ?? null,
    verification_deadline: resolutionStatusMap.get(row.id)?.verification_deadline ?? null,
    severity_classification: getViolationSeverity(row.violation_description ?? null, row.violation_code ?? null),
  }));

  if (toInsert.length > 0) {
    // Debug: log first payload we send to Supabase (columns must match violations table)
    const first = toInsert[0];
    console.log("[rescan] First toInsert violation_inspector_comments:", first.violation_inspector_comments ?? "(null)", "violation_ordinance:", first.violation_ordinance ?? "(null)");
    const { error: insertErr } = await supabase.from("violations").insert(toInsert);
    if (insertErr) return { error: insertErr.message };

    await logComplianceEventBatch(
      toInsert.slice(0, 100).map((v) => ({
        propertyId: property.id,
        userId: user.id,
        eventType: "violation_detected" as const,
        eventData: {
          violation_code: v.violation_code ?? undefined,
          violation_description: v.violation_description ?? undefined,
          inspection_category: v.inspection_category ?? undefined,
          description: "Detected during manual rescan",
        },
      }))
    );
  }

  await logComplianceEvent({
    propertyId: property.id,
    userId: user.id,
    eventType: "property_rescanned",
    eventData: {
      violations_found: rows.length,
      new_violations: toInsert.length,
      status_changes: 0,
      description: `Manual rescan: ${rows.length} violations found`,
    },
  });

  await supabase
    .from("properties")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("id", propertyId);

  revalidatePath(`/dashboard/${propertyId}`);
  return { count: rows.length };
}

export async function submitResolution(data: {
  violationId: string;
  propertyId: string;
  resolutionMethod: string;
  fixDate: string | null;
  emergencyFix: boolean | null;
  isRecurring: string;
  costRange: string;
  exactCost: number | null;
  multipleQuotes: boolean;
  quotesCount: number | null;
  contractorName: string | null;
  contractorTrade: string | null;
  contractorPhone: string | null;
  contractorWebsite: string | null;
  wouldUseAgain: string | null;
  contractorRating: number | null;
  contractorSource: string | null;
  workOnSchedule: string | null;
  affectedAreas: string[];
  additionalIssuesFound: boolean;
  additionalIssuesDescription: string | null;
  fixDescription: string | null;
  casalertsAlertedFirst: string;
  deadlineMet: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: violationForExternalId } = await supabase
    .from("violations")
    .select("external_id")
    .eq("id", data.violationId)
    .single();

  const { error: insertErr } = await supabase
    .from("violation_resolutions")
    .insert({
      violation_id: data.violationId,
      violation_external_id: violationForExternalId?.external_id ?? null,
      property_id: data.propertyId,
      user_id: user.id,
      resolution_method: data.resolutionMethod,
      fix_date: data.fixDate ? new Date(data.fixDate).toISOString() : null,
      emergency_fix: data.emergencyFix,
      is_recurring: data.isRecurring,
      cost_range: data.costRange,
      cost: null,
      exact_cost: data.exactCost ?? null,
      multiple_quotes: data.multipleQuotes,
      quotes_count: data.quotesCount,
      contractor_name: data.contractorName,
      contractor_trade: data.contractorTrade,
      contractor_phone: data.contractorPhone,
      contractor_website: data.contractorWebsite,
      would_use_again: data.wouldUseAgain,
      contractor_rating: data.contractorRating,
      contractor_recommended:
        data.wouldUseAgain === "Yes"
          ? true
          : data.wouldUseAgain === "No"
            ? false
            : null,
      contractor_source: data.contractorSource ?? null,
      work_on_schedule: data.workOnSchedule ?? null,
      affected_areas: data.affectedAreas,
      additional_issues_found: data.additionalIssuesFound,
      additional_issues_description: data.additionalIssuesDescription,
      fix_description: data.fixDescription,
      casalerts_alerted_first: data.casalertsAlertedFirst,
      knew_before_casalerts:
        data.casalertsAlertedFirst === "No, I already knew"
          ? "Yes"
          : data.casalertsAlertedFirst === "Yes, CasAlert told me first"
            ? "No"
            : "Not sure",
      deadline_met:
        data.deadlineMet === "Yes"
          ? true
          : data.deadlineMet === "No"
            ? false
            : null,
      duration: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (insertErr) return { error: insertErr.message };

  const verificationDeadline = new Date();
  verificationDeadline.setDate(verificationDeadline.getDate() + 45);

  const { error: updateErr } = await supabase
    .from("violations")
    .update({
      user_resolution_status: "pending_verification",
      user_resolved_at: new Date().toISOString(),
      verification_deadline: verificationDeadline.toISOString(),
    })
    .eq("id", data.violationId);

  if (updateErr) return { error: updateErr.message };

  await logComplianceEvent({
    propertyId: data.propertyId,
    userId: user.id,
    eventType: "resolution_form_submitted",
    eventData: {
      resolution_method: data.resolutionMethod,
      resolution_cost_range: data.costRange,
      violation_code: data.violationId,
      description: `Resolution submitted: ${data.resolutionMethod}`,
    },
  });

  if (data.contractorName) {
    await logComplianceEvent({
      propertyId: data.propertyId,
      userId: user.id,
      eventType: "contractor_recorded",
      eventData: {
        contractor_name: data.contractorName,
        contractor_trade: data.contractorTrade ?? undefined,
        description: `Contractor recorded: ${data.contractorName}`,
      },
    });
  }

  revalidatePath(`/dashboard/${data.propertyId}`);
  return {};
}

export async function revertResolution(
  violationId: string,
  propertyId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("violations")
    .update({
      user_resolution_status: "open",
      user_resolved_at: null,
      verification_deadline: null,
    })
    .eq("id", violationId);

  if (error) return { error: error.message };

  await logComplianceEvent({
    propertyId,
    userId: user.id,
    eventType: "violation_resolved_by_user",
    violationId,
    eventData: {
      description: "User reverted resolution status back to open",
      old_status: "pending_verification",
      new_status: "open",
    },
  });

  revalidatePath(`/dashboard/${propertyId}`);
  return {};
}

export async function updatePropertyNickname(
  propertyId: string,
  nickname: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("properties")
    .update({ nickname: nickname?.trim() || null })
    .eq("id", propertyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${propertyId}`);
  revalidatePath("/dashboard");
  return {};
}
