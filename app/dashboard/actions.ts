"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function removeProperty(propertyId: string): Promise<{ error?: string }> {
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
