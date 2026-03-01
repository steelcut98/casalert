import { NextResponse } from "next/server";

const BUILDING_VIOLATIONS_URL =
  "https://data.cityofchicago.org/resource/22u3-xenr.json";
const PAGE_SIZE = 1000;

/**
 * Key fields for Building Violations (22u3-xenr) — from dataset schema fieldName:
 * https://data.cityofchicago.org/api/views/22u3-xenr.json
 * inspection_category: COMPLAINT (tenant 311 - highest risk), PERIODIC, PERMIT, REGISTRATION
 */
const SELECT_FIELDS = [
  "id",
  "violation_date",
  "violation_code",
  "violation_description",
  "violation_status",
  "violation_status_date",
  "violation_inspector_comments",
  "violation_ordinance",
  "inspector_id",
  "inspection_number",
  "inspection_status",
  "inspection_category",
  "address",
  "property_group",
].join(",");

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
        $select: SELECT_FIELDS,
        $order: "violation_date DESC",
      });

      const url = `${BUILDING_VIOLATIONS_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-App-Token": process.env.SOCRATA_APP_TOKEN ?? "",
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[chicago-building-violations] API error", res.status, text);
        return NextResponse.json(
          {
            error: "Chicago Building Violations API request failed",
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

      // Debug: log first violation raw from Chicago API (terminal when route is hit)
      if (data.length > 0 && allResults.length === 0) {
        const first = data[0] as Record<string, unknown>;
        console.log("[chicago-api-route] First violation raw keys:", Object.keys(first).sort().join(", "));
        console.log("[chicago-api-route] First violation violation_inspector_comments:", first["violation_inspector_comments"]);
        console.log("[chicago-api-route] First violation violation_ordinance:", first["violation_ordinance"]);
      }

      allResults.push(...data);
      hasMore = data.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    return NextResponse.json({
      dataset: "building",
      address,
      total: allResults.length,
      data: allResults,
    });
  } catch (err) {
    console.error("[chicago-building-violations] Fetch error", err);
    return NextResponse.json(
      {
        error: "Failed to fetch building violations",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
