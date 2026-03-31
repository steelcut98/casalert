import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViolationSeverity } from "@/lib/compliance-score";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: violations, error } = await supabase
    .from("violations")
    .select("id, violation_description, violation_code")
    .is("severity_classification", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  for (const v of violations ?? []) {
    const severity = getViolationSeverity(v.violation_description, v.violation_code);
    const { error: updateErr } = await supabase
      .from("violations")
      .update({ severity_classification: severity })
      .eq("id", v.id);
    if (!updateErr) updated++;
  }

  return NextResponse.json({ total: violations?.length ?? 0, updated });
}
