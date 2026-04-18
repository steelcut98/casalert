"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logComplianceEvent } from "@/lib/compliance-events";
import { logAnalyticsEvent } from "@/lib/analytics-events";

export async function removeProperty(
  propertyId: string,
  feedback?: {
    removal_reason?: string | null;
    sold_date?: string | null;
    would_recommend?: string | null;
  }
): Promise<{ error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: property } = await userClient
    .from("properties")
    .select("id, address, city_id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();
  if (!property) return { error: "Property not found" };

  const admin = createAdminClient();
  if (feedback && (feedback.removal_reason || feedback.would_recommend || feedback.sold_date)) {
    const { data: cityRow } = await admin.from("cities").select("slug").eq("id", property.city_id).single();
    const { error: fbErr } = await admin.from("property_removal_feedback").insert({
      user_id: user.id,
      property_address: property.address,
      city_slug: cityRow?.slug ?? null,
      removal_reason: feedback.removal_reason ?? null,
      sold_date: feedback.sold_date || null,
      would_recommend: feedback.would_recommend ?? null,
    });
    if (fbErr) console.error("[removeProperty] feedback insert error", fbErr);
  }

  await logComplianceEvent({
    propertyId,
    userId: user.id,
    eventType: "property_removed",
    eventData: {
      description: `Property removed: ${property.address}`,
      removal_reason: feedback?.removal_reason ?? undefined,
      would_recommend: feedback?.would_recommend ?? undefined,
    },
  });

  await logAnalyticsEvent({
    userId: user.id,
    eventType: "button_click",
    propertyId,
    eventData: { action: "remove_property", address: property.address },
  });

  const { data: violations } = await admin
    .from("violations")
    .select("id")
    .eq("property_id", propertyId);
  const violationIds = (violations ?? []).map((v) => v.id);

  if (violationIds.length > 0) {
    const { error: remindersErr } = await admin
      .from("violation_reminders")
      .delete()
      .in("violation_id", violationIds);
    if (remindersErr) return { error: remindersErr.message };
  }

  const { error: violationsErr } = await admin
    .from("violations")
    .delete()
    .eq("property_id", propertyId);
  if (violationsErr) return { error: violationsErr.message };

  const { error: propErr } = await admin
    .from("properties")
    .delete()
    .eq("id", propertyId);
  if (propErr) return { error: propErr.message };

  revalidatePath("/dashboard");
  return {};
}

export async function pinProperty(propertyId: string): Promise<{ error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: property } = await userClient
    .from("properties")
    .select("id, address")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();
  if (!property) return { error: "Property not found" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("properties")
    .update({ pinned_at: new Date().toISOString() })
    .eq("id", propertyId);
  if (error) return { error: error.message };

  await logAnalyticsEvent({
    userId: user.id,
    eventType: "button_click",
    propertyId,
    eventData: { action: "pin_property", address: property.address },
  });

  revalidatePath("/dashboard");
  return {};
}
