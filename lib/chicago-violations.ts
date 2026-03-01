/**
 * Shared Chicago Building Violations (22u3-xenr) API client.
 * Used by onboarding (validation + baseline scan) and cron (scan).
 * Queries by address and optionally by property_group to catch all violations
 * for the same building.
 */

const BUILDING_VIOLATIONS_URL =
  "https://data.cityofchicago.org/resource/22u3-xenr.json";
const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

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

export type ChicagoViolationRow = {
  id: string;
  violation_date?: string;
  violation_code?: string;
  violation_description?: string;
  violation_status?: string;
  violation_status_date?: string;
  violation_inspector_comments?: string;
  violation_ordinance?: string;
  inspector_id?: string;
  inspection_number?: string;
  inspection_status?: string;
  inspection_category?: string;
  address?: string;
  property_group?: string;
};

function buildWhereAddress(address: string): string {
  const escaped = address.replace(/'/g, "''");
  return `upper(address) like upper('%${escaped}%')`;
}

function buildWherePropertyGroup(propertyGroup: string): string {
  const escaped = propertyGroup.replace(/'/g, "''");
  return `property_group = '${escaped}'`;
}

async function fetchPage(
  where: string,
  offset: number,
  opts: { appToken?: string }
): Promise<ChicagoViolationRow[]> {
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
      "X-App-Token": opts.appToken ?? "",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Chicago API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Chicago API returned non-array");
  }
  // Debug: log first row from Chicago API to verify violation_inspector_comments / violation_ordinance
  if (data.length > 0 && offset === 0) {
    const first = data[0] as Record<string, unknown>;
    console.log("[chicago-violations] First row keys:", Object.keys(first).sort().join(", "));
    console.log("[chicago-violations] First row violation_inspector_comments:", first["violation_inspector_comments"]);
    console.log("[chicago-violations] First row violation_ordinance:", first["violation_ordinance"]);
  }
  return data as ChicagoViolationRow[];
}

async function fetchAllWithRetry(
  where: string,
  opts: { appToken?: string }
): Promise<ChicagoViolationRow[]> {
  const rows: ChicagoViolationRow[] = [];
  let offset = 0;
  let attempt = 0;
  let backoff = INITIAL_BACKOFF_MS;

  while (true) {
    try {
      const page = await fetchPage(where, offset, opts);
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      attempt = 0;
      backoff = INITIAL_BACKOFF_MS;
    } catch (err) {
      attempt++;
      if (attempt > MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, backoff));
      backoff *= 2;
    }
  }
  return rows;
}

/**
 * Validate that an address exists in the Chicago building violations database
 * (at least one row). Returns the first row so caller can read property_group.
 */
export async function validateChicagoAddress(
  address: string,
  opts: { appToken?: string } = {}
): Promise<{ valid: true; propertyGroup: string | null; sample: ChicagoViolationRow } | { valid: false; error: string }> {
  const where = buildWhereAddress(address);
  try {
    const page = await fetchPage(where, 0, opts);
    if (page.length === 0) {
      return { valid: false, error: "Address not found in Chicago building violations database." };
    }
    const sample = page[0];
    return {
      valid: true,
      propertyGroup: sample.property_group ?? null,
      sample,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Failed to validate address",
    };
  }
}

/**
 * Fetch all violations for an address and, if property_group is set,
 * all violations for that property_group (same building, different address).
 * Merges and dedupes by id.
 */
export async function fetchChicagoViolationsForProperty(
  address: string,
  propertyGroup: string | null,
  opts: { appToken?: string } = {}
): Promise<ChicagoViolationRow[]> {
  const byAddress = await fetchAllWithRetry(buildWhereAddress(address), opts);
  const seen = new Set<string>(byAddress.map((r) => r.id));

  if (propertyGroup && propertyGroup.trim()) {
    const byGroup = await fetchAllWithRetry(
      buildWherePropertyGroup(propertyGroup.trim()),
      opts
    );
    for (const r of byGroup) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        byAddress.push(r);
      }
    }
  }

  byAddress.sort((a, b) => {
    const da = a.violation_date ? new Date(a.violation_date).getTime() : 0;
    const db = b.violation_date ? new Date(b.violation_date).getTime() : 0;
    return db - da;
  });
  return byAddress;
}
