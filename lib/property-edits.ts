import { createAdminClient } from "@/lib/supabase/admin";

type FieldDiff = {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
};

export async function logPropertyEdits(params: {
  userId: string;
  changedByUserId: string;
  propertyId: string | null;
  tableName: "property_details" | "properties" | "profiles";
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}): Promise<{ error?: string; changesLogged: number }> {
  const { userId, changedByUserId, propertyId, tableName, oldValues, newValues } = params;

  const normalize = (v: unknown): string | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
  };

  const diffs: FieldDiff[] = [];
  for (const key of Object.keys(newValues)) {
    const oldNorm = normalize(oldValues[key]);
    const newNorm = normalize(newValues[key]);
    if (oldNorm !== newNorm) {
      diffs.push({ field_name: key, old_value: oldNorm, new_value: newNorm });
    }
  }

  if (diffs.length === 0) return { changesLogged: 0 };

  const admin = createAdminClient();
  const { error } = await admin.from("property_edits_audit").insert(
    diffs.map((d) => ({
      user_id: userId,
      changed_by_user_id: changedByUserId,
      property_id: propertyId,
      table_name: tableName,
      field_name: d.field_name,
      old_value: d.old_value,
      new_value: d.new_value,
    }))
  );

  if (error) {
    console.error("[property-edits] audit insert error", error);
    return { error: error.message, changesLogged: 0 };
  }
  return { changesLogged: diffs.length };
}
