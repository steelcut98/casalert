import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPropertyDetails } from "@/lib/property-enrichment";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";

  if (!address || !city) {
    return NextResponse.json(
      { error: "Missing address or city" },
      { status: 400 }
    );
  }

  try {
    const details = await getPropertyDetails(address, city);
    return NextResponse.json(details ?? {});
  } catch {
    return NextResponse.json({});
  }
}
