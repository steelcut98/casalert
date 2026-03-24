/**
 * Fetches property characteristics from public city databases.
 * All functions return null on failure — enrichment is optional and must not block the app.
 */

const FETCH_TIMEOUT_MS = 5000;

export type PropertyEnrichment = {
  year_built: number | null;
  units: number | null;
  square_footage: number | null;
  assessed_value: number | null;
  property_type: string | null;
  lot_size: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  stories?: number | null;
  exterior_condition?: string | null;
  interior_condition?: string | null;
};

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

function normalizeAddressForQuery(addr: string): string {
  return addr
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*(#|UNIT|APT|SUITE|STE|FL)\s*.*$/i, "")
    .trim();
}

function safeNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function safeString(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

const CHICAGO_PERMITS_URL = "https://data.cityofchicago.org/resource/ydr8-5enu.json";
const DIRECTION = /^(N|S|E|W|NE|NW|SE|SW)$/;

/** Parse "123 N MAIN ST" into { streetNum, direction, streetName } */
function parseChicagoAddress(address: string): { streetNum: string; direction: string; streetName: string } | null {
  const normalized = normalizeAddressForQuery(address);
  if (!normalized) return null;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const streetNum = parts[0];
  const direction = parts.length >= 2 && DIRECTION.test(parts[1]) ? parts[1] : "";
  const streetNameStart = direction ? 2 : 1;
  const streetName = parts.slice(streetNameStart).join(" ") || (parts[streetNameStart] ?? "");
  return { streetNum, direction, streetName };
}

/**
 * Get property details from Chicago Building Permits dataset only.
 * Uses street_number, street_direction, street_name with $order=issue_date DESC.
 */
export async function getChicagoPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  const parsed = parseChicagoAddress(address);
  if (!parsed || !parsed.streetNum || !parsed.streetName) return null;

  const esc = (s: string) => String(s).replace(/'/g, "''");
  const streetNum = esc(parsed.streetNum);
  const direction = esc(parsed.direction);
  const streetName = esc(parsed.streetName);

  let where = `street_number='${streetNum}' AND upper(street_name) like upper('${streetName}%')`;
  if (parsed.direction) {
    where = `street_number='${streetNum}' AND upper(street_direction)='${direction}' AND upper(street_name) like upper('${streetName}%')`;
  }

  try {
    const params = new URLSearchParams({
      $where: where,
      $limit: "1",
      $order: "issue_date DESC",
    });
    const url = `${CHICAGO_PERMITS_URL}?${params.toString()}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as Record<string, unknown>;
    return {
      year_built: safeNumber(row.year_built ?? row.yearbuilt),
      units: null,
      square_footage: safeNumber(row.total_livable_area ?? row.total_building_area),
      assessed_value: null,
      property_type: safeString(row.building_code_description_new ?? row.work_description),
      lot_size: null,
    };
  } catch {
    return null;
  }
}

const PHILLY_CARTO_URL = "https://phl.carto.com/api/v2/sql";

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Get property details from Philadelphia OPA properties (opa_properties_public).
 */
export async function getPhiladelphiaPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  const normalized = normalizeAddressForQuery(address);
  if (!normalized) return null;
  const escaped = escapeSql(normalized);

  try {
    const exactSql = `SELECT year_built, category_code_description, number_of_bedrooms, number_of_bathrooms, number_stories, total_livable_area, market_value, exterior_condition, interior_condition, sale_date, sale_price FROM opa_properties_public WHERE location = upper('${escaped}') LIMIT 1`;
    let url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(exactSql)}`;
    let res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    let data = (await res.json()) as { rows?: Record<string, unknown>[] };
    let rows = data.rows ?? [];

    if (rows.length === 0) {
      const parts = normalized.split(/\s+/).filter(Boolean);
      const streetNum = parts[0] ?? "";
      const streetName = parts.length > 1 ? parts.slice(1).join(" ") : "";
      if (streetNum && streetName) {
        const likeSql = `SELECT year_built, category_code_description, number_of_bedrooms, number_of_bathrooms, number_stories, total_livable_area, market_value, exterior_condition, interior_condition, sale_date, sale_price FROM opa_properties_public WHERE location LIKE upper('%${escapeSql(streetNum)}%${escapeSql(streetName)}%') LIMIT 1`;
        url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(likeSql)}`;
        res = await fetchWithTimeout(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          data = (await res.json()) as { rows?: Record<string, unknown>[] };
          rows = data.rows ?? [];
        }
      }
    }

    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    const categoryDesc = safeString(row.category_code_description);

    let units: number | null = null;
    if (categoryDesc && (/\d+\s*unit|multi|apartment|condo/i.test(categoryDesc) || /\d+/.test(categoryDesc))) {
      const match = categoryDesc.match(/(\d+)\s*unit/i) ?? categoryDesc.match(/(\d+)/);
      units = match ? safeNumber(match[1]) : null;
    }

    return {
      year_built: safeNumber(row.year_built),
      units,
      square_footage: safeNumber(row.total_livable_area),
      assessed_value: safeNumber(row.market_value),
      property_type: categoryDesc,
      lot_size: null,
      bedrooms: safeNumber(row.number_of_bedrooms),
      bathrooms: safeNumber(row.number_of_bathrooms),
      stories: safeNumber(row.number_stories),
      exterior_condition: safeString(row.exterior_condition),
      interior_condition: safeString(row.interior_condition),
    };
  } catch {
    return null;
  }
}

/**
 * Check if address exists in Chicago building permits (for validation only).
 */
export async function checkChicagoAddressInPermits(address: string): Promise<boolean> {
  const parsed = parseChicagoAddress(address);
  if (!parsed || !parsed.streetNum || !parsed.streetName) return false;
  const esc = (s: string) => String(s).replace(/'/g, "''");
  let where = `street_number='${esc(parsed.streetNum)}' AND upper(street_name) like upper('${esc(parsed.streetName)}%')`;
  if (parsed.direction) {
    where = `street_number='${esc(parsed.streetNum)}' AND upper(street_direction)='${esc(parsed.direction)}' AND upper(street_name) like upper('${esc(parsed.streetName)}%')`;
  }
  try {
    const params = new URLSearchParams({ $where: where, $limit: "1" });
    const res = await fetchWithTimeout(`${CHICAGO_PERMITS_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if address exists in Philadelphia OPA properties (for validation only).
 */
export async function checkPhiladelphiaAddressInOPA(address: string): Promise<boolean> {
  const normalized = normalizeAddressForQuery(address);
  if (!normalized) return false;
  const escaped = escapeSql(normalized);
  try {
    const sql = `SELECT location FROM opa_properties_public WHERE location = upper('${escaped}') LIMIT 1`;
    const url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(sql)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { rows?: unknown[] };
    return Array.isArray(data.rows) && data.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Wrapper: calls the correct city function and returns enrichment or null. Never throws.
 */
export async function getPropertyDetails(
  address: string,
  city: string
): Promise<PropertyEnrichment | null> {
  try {
    const c = city.toLowerCase().trim();
    if (c === "chicago") return await getChicagoPropertyDetails(address);
    if (c === "philadelphia") return await getPhiladelphiaPropertyDetails(address);
    return null;
  } catch {
    return null;
  }
}
