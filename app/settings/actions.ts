"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileField(
  field: string,
  value: string | boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "free";
  const isPaid = plan === "starter" || plan === "pro";

  const updates: Record<string, unknown> = {};
  if (field === "phone") updates.phone = typeof value === "string" ? (value.trim() || null) : null;
  else if (field === "email_alerts_enabled") updates.email_alerts_enabled = value;
  else if (field === "sms_alerts_enabled") updates.sms_alerts_enabled = isPaid ? value : false;
  else if (field === "email_reminders_enabled") updates.email_reminders_enabled = value;
  else if (field === "sms_reminders_enabled") updates.sms_reminders_enabled = isPaid ? value : false;
  else if (field === "alert_periodic") updates.alert_periodic = value;
  else if (field === "alert_registration") updates.alert_registration = value;
  else if (field === "alert_permit") updates.alert_permit = value;

  if (Object.keys(updates).length === 0) return {};

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}

export async function updateNotificationSettings(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const phone = (formData.get("phone") as string)?.trim() ?? null;
  const emailAlerts = formData.get("email_alerts") === "on";
  const smsAlerts = formData.get("sms_alerts") === "on";
  const alertPeriodic = formData.get("alert_periodic") === "on";
  const alertRegistration = formData.get("alert_registration") === "on";
  const alertPermit = formData.get("alert_permit") === "on";

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "free";
  const isPaid = plan === "starter" || plan === "pro";

  const updates: Record<string, unknown> = {
    phone: phone || null,
    email_alerts_enabled: emailAlerts,
    alert_complaint: true,
    alert_periodic: alertPeriodic,
    alert_registration: alertRegistration,
    alert_permit: alertPermit,
  };
  updates.sms_alerts_enabled = isPaid ? smsAlerts : false;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}
