/**
 * Philadelphia L&I violations via Carto SQL API.
 * Used by onboarding (validation + baseline scan) and cron (scan).
 * Endpoint: https://phl.carto.com/api/v2/sql?q=YOUR_SQL_QUERY
 * Response: { rows: [...], time: ..., fields: {...} }
 */

const CARTO_SQL_URL = "https://phl.carto.com/api/v2/sql";
const PAGE_SIZE = 1000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/** Philadelphia API row (Carto column names). */
export type PhiladelphiaViolationRow = {
  violationnumber: string;
  violationdate: string;
  violationresolutiondate?: string | null;
  violationcode: string | null;
  violationcodetitle: string | null;
  violationstatus: string | null;
  casetype: string | null;
  caseresponsibility: string | null;
  violationresolutioncode: string | null;
  address: string | null;
  opa_account_num: string | null;
};

/** Normalized row matching our DB / Chicago shape for shared UI. */
export type PhiladelphiaViolationNormalized = {
  id: string;
  violation_date: string | null;
  violation_code: string | null;
  violation_description: string | null;
  violation_status: string | null;
  violation_status_date: string | null;
  violation_inspector_comments: string | null;
  violation_ordinance: string | null;
  inspector_id: string | null;
  inspection_category: string | null;
  address: string | null;
  property_group: string | null;
};

function mapCaseTypeToInspectionCategory(caseType: string | null): string {
  if (!caseType || !caseType.trim()) return "Unknown";
  const u = caseType.toUpperCase();
  if (u.includes("NOTICE OF VIOLATION") || u.includes("CLIP VIOLATION NOTICE")) return "COMPLAINT";
  if (u.includes("WARNING NOTICE")) return "PERIODIC";
  if (u.includes("SITE VIOLATION NOTICE")) return "COMPLAINT";
  return caseType;
}

function normalizeRow(r: PhiladelphiaViolationRow): PhiladelphiaViolationNormalized {
  const codePart = [r.violationcode, r.violationcodetitle].filter(Boolean).join(" / ");
  const ordinanceText = codePart + (r.violationresolutioncode ? " Resolution: " + r.violationresolutioncode : "");
  return {
    id: String(r.violationnumber ?? ""),
    violation_date: r.violationdate ?? null,
    violation_code: r.violationcode ?? null,
    violation_description: r.violationcodetitle ?? null,
    violation_status: r.violationstatus ?? null,
    violation_status_date: r.violationresolutiondate ?? r.violationdate ?? null,
    violation_inspector_comments: r.caseresponsibility ?? null,
    violation_ordinance: ordinanceText.trim() || null,
    inspector_id: r.caseresponsibility ?? null,
    inspection_category: mapCaseTypeToInspectionCategory(r.casetype),
    address: r.address ?? null,
    property_group: r.opa_account_num ?? null,
  };
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Build WHERE conditions for flexible address match: each non-empty token from the
 * address must appear in the DB address (LIKE '%token%'), so "1282 MARKET ST"
 * matches "1282 MARKET ST" or "1282  MARKET  ST" etc.
 */
function buildAddressLikeConditions(address: string): string {
  const tokens = address
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return "1=0";
  return tokens
    .map((t) => `UPPER(address) LIKE '%${escapeSql(t)}%'`)
    .join(" AND ");
}

async function runQuery(sql: string): Promise<PhiladelphiaViolationRow[]> {
  console.log("[philadelphia-violations] SQL:", sql);
  const url = `${CARTO_SQL_URL}?q=${encodeURIComponent(sql)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Philadelphia Carto API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as { rows?: PhiladelphiaViolationRow[]; time?: number; fields?: unknown };
  console.log("[philadelphia-violations] raw response: rows count =", data.rows?.length ?? 0, "first row =", data.rows?.[0] ?? "none");
  if (!data.rows || !Array.isArray(data.rows)) {
    throw new Error("Philadelphia Carto API returned no rows array");
  }
  return data.rows;
}

/**
 * Validate that an address exists (at least one row). Returns sample for property_group (opa_account_num).
 */
export async function validatePhiladelphiaAddress(
  address: string
): Promise<{ valid: true; propertyGroup: string | null; sample: PhiladelphiaViolationNormalized } | { valid: false; error: string }> {
  const addressConditions = buildAddressLikeConditions(address);
  const sql = `SELECT violationnumber, violationdate, violationresolutiondate, violationcode, violationcodetitle, violationstatus, casetype, caseresponsibility, violationresolutioncode, address, opa_account_num FROM violations WHERE ${addressConditions} AND violationdate >= '2020-01-01' ORDER BY violationdate DESC LIMIT 1`;
  try {
    const rows = await runQuery(sql);
    if (rows.length === 0) {
      return { valid: false, error: "Address not found in Philadelphia L&I violations database." };
    }
    const sample = normalizeRow(rows[0]);
    return {
      valid: true,
      propertyGroup: rows[0].opa_account_num ?? null,
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
 * Fetch all violations for an address. Philadelphia does not have a separate property_group fetch like Chicago; we use address only.
 */
export async function fetchPhiladelphiaViolationsForProperty(
  address: string
): Promise<PhiladelphiaViolationNormalized[]> {
  const addressConditions = buildAddressLikeConditions(address);
  const allRows: PhiladelphiaViolationRow[] = [];
  let offset = 0;
  let attempt = 0;
  let backoff = INITIAL_BACKOFF_MS;

  while (true) {
    try {
      const sql = `SELECT violationnumber, violationdate, violationresolutiondate, violationcode, violationcodetitle, violationstatus, casetype, caseresponsibility, violationresolutioncode, address, opa_account_num FROM violations WHERE ${addressConditions} AND violationdate >= '2020-01-01' ORDER BY violationdate DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
      const page = await runQuery(sql);
      allRows.push(...page);
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

  const result = allRows.map(normalizeRow);
  result.sort((a, b) => {
    const da = a.violation_date ? new Date(a.violation_date).getTime() : 0;
    const db = b.violation_date ? new Date(b.violation_date).getTime() : 0;
    return db - da;
  });
  return result;
}
