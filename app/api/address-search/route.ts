import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHICAGO_VIOLATIONS_URL = "https://data.cityofchicago.org/resource/22u3-xenr.json";
const PHILADELPHIA_CARTO_URL = "https://phl.carto.com/api/v2/sql";

function escapeForLike(s: string): string {
  return s.replace(/'/g, "''");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const city = (searchParams.get("city")?.trim() ?? "chicago").toLowerCase();

  if (query.length < 2) {
    return NextResponse.json({ addresses: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const limit = 10;

  if (city === "philadelphia") {
    try {
      const escaped = escapeForLike(query);
      const sql = `SELECT DISTINCT address FROM violations WHERE UPPER(address) LIKE '%' || UPPER('${escaped}') || '%' ORDER BY address LIMIT ${limit * 2}`;
      const url = `${PHILADELPHIA_CARTO_URL}?q=${encodeURIComponent(sql)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json({ addresses: [], error: "Philadelphia API error" }, { status: 502 });
      }
      const data = (await res.json()) as { rows?: { address: string }[] };
      const rows = data.rows ?? [];
      const addresses = [...new Set(rows.map((r) => r.address).filter(Boolean))].slice(0, limit);
      if (user) {
        try {
          await createAdminClient().from("address_searches").insert({
            user_id: user.id,
            address: query,
            city,
            property_added: false,
          });
        } catch (e) {
          console.error("[address-search] log search", e);
        }
      }
      return NextResponse.json({ addresses });
    } catch (err) {
      console.error("[address-search] Philadelphia", err);
      return NextResponse.json({ addresses: [], error: String(err) }, { status: 502 });
    }
  }

  if (city === "chicago") {
    try {
      const escaped = escapeForLike(query);
      const where = `upper(address) like upper('%${escaped}%')`;
      const params = new URLSearchParams({
        $select: "address",
        $where: where,
        $limit: "50",
      });
      const url = `${CHICAGO_VIOLATIONS_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-App-Token": process.env.SOCRATA_APP_TOKEN ?? "",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json({ addresses: [], error: "Chicago API error" }, { status: 502 });
      }
      const data = (await res.json()) as { address?: string }[];
      if (!Array.isArray(data)) {
        return NextResponse.json({ addresses: [] });
      }
      const addresses = [...new Set(data.map((r) => r.address).filter(Boolean))].slice(0, limit);
      if (user) {
        try {
          await createAdminClient().from("address_searches").insert({
            user_id: user.id,
            address: query,
            city,
            property_added: false,
          });
        } catch (e) {
          console.error("[address-search] log search", e);
        }
      }
      return NextResponse.json({ addresses });
    } catch (err) {
      console.error("[address-search] Chicago", err);
      return NextResponse.json({ addresses: [], error: String(err) }, { status: 502 });
    }
  }

  return NextResponse.json({ addresses: [] });
}
