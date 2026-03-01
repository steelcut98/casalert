import { NextResponse } from "next/server";

const ORDINANCE_VIOLATIONS_URL =
  "https://data.cityofchicago.org/resource/6br9-quuz.json";
const PAGE_SIZE = 1000;

/**
 * Ordinance Violations (6br9-quuz) — violations that have escalated to
 * administrative hearings (Department of Administrative Hearings).
 */

/**
 * Builds a SoQL $where clause for address search.
 * Escapes single quotes by doubling them (SoQL convention).
 */
function buildWhereClause(address: string): string {
  const escaped = address.replace(/'/g, "''");
  return `upper(address) like upper('%${escaped}%')`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json(
      { error: "Missing required query parameter: address" },
      { status: 400 }
    );
  }

  const allResults: unknown[] = [];
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const where = buildWhereClause(address);
      const params = new URLSearchParams({
        $limit: String(PAGE_SIZE),
        $offset: String(offset),
        $where: where,
        $order: "violation_date DESC",
      });

      const url = `${ORDINANCE_VIOLATIONS_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-App-Token": process.env.SOCRATA_APP_TOKEN ?? "",
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[chicago-ordinance-violations] API error", res.status, text);
        return NextResponse.json(
          {
            error: "Chicago Ordinance Violations API request failed",
            status: res.status,
            details: res.statusText,
          },
          { status: 502 }
        );
      }

      const data = (await res.json()) as unknown[];
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { error: "Unexpected response format from Chicago API" },
          { status: 502 }
        );
      }

      allResults.push(...data);
      hasMore = data.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({
      dataset: "ordinance",
      address,
      total: allResults.length,
      data: allResults,
    });
  } catch (err) {
    console.error("[chicago-ordinance-violations] Fetch error", err);
    return NextResponse.json(
      {
        error: "Failed to fetch ordinance violations",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
