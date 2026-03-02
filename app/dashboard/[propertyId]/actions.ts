"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchChicagoViolationsForProperty } from "@/lib/chicago-violations";
import { fetchPhiladelphiaViolationsForProperty } from "@/lib/philadelphia-violations";

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

  // Delete all existing violations for this property so we can repopulate with full fields
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
  }));

  if (toInsert.length > 0) {
    // Debug: log first payload we send to Supabase (columns must match violations table)
    const first = toInsert[0];
    console.log("[rescan] First toInsert violation_inspector_comments:", first.violation_inspector_comments ?? "(null)", "violation_ordinance:", first.violation_ordinance ?? "(null)");
    const { error: insertErr } = await supabase.from("violations").insert(toInsert);
    if (insertErr) return { error: insertErr.message };
  }

  await supabase
    .from("properties")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("id", propertyId);

  revalidatePath(`/dashboard/${propertyId}`);
  return { count: rows.length };
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
