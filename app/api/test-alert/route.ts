import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNewViolationEmail } from "@/lib/email-alerts";

export async function GET() {
  console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", user.id)
    .single();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, city_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!property) {
    return NextResponse.json({ success: false, error: "No properties found" }, { status: 400 });
  }

  const { data: city } = await supabase
    .from("cities")
    .select("slug")
    .eq("id", property.city_id)
    .single();

  const { data: violation } = await supabase
    .from("violations")
    .select(
      "inspection_category, violation_date, violation_code, violation_description, violation_status"
    )
    .eq("property_id", property.id)
    .order("violation_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!violation) {
    return NextResponse.json(
      { success: false, error: "No violations found for first property" },
      { status: 400 }
    );
  }

  const toEmail = user.email ?? profile?.email ?? "";
  if (!toEmail) {
    return NextResponse.json(
      { success: false, error: "Could not determine user email" },
      { status: 400 }
    );
  }

  const result = await sendNewViolationEmail(
    toEmail,
    property.address,
    property.id,
    [violation],
    city?.slug ?? ""
  );
  console.log("Send result:", JSON.stringify(result));

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error ?? "Send failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Test email sent to ${toEmail}`,
  });
}

