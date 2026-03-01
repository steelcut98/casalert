"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
