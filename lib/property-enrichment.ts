/**
 * Fetches property characteristics from public city databases.
 * All functions return null on failure — enrichment is optional and must not block the app.
 */

const FETCH_TIMEOUT_MS = 5000;

export type PropertyEnrichment = {
  year_built: number | null;
  property_type: string | null;
  square_footage: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  stories?: number | null;
  exterior_condition?: string | null;
  interior_condition?: string | null;
  units: number | null;
  market_value?: number | null;
  sale_price?: number | null;
  sale_date?: string | null;
  building_description?: string | null;
  central_air?: boolean | null;
  garage_spaces?: number | null;
  quality_grade?: string | null;
  zoning?: string | null;
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

export async function getChicagoPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  void address;
  // Cook County Assessor API not currently accessible. Chicago enrichment disabled until a reliable data source is found.
  return null;
}

const PHILLY_CARTO_URL = "https://phl.carto.com/api/v2/sql";

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

const STREET_SUFFIXES = /\b(ST|AVE|BLVD|DR|RD|CT|PL|LN|WAY|TER|CIR)\.?$/i;

function stripStreetSuffix(address: string): string {
  return address.replace(STREET_SUFFIXES, "").trim();
}

function parsePhillyAddress(address: string): { streetNum: string; direction: string; streetName: string } {
  const parts = normalizeAddressForQuery(address).split(/\s+/).filter(Boolean);
  const streetNum = parts[0] ?? "";
  const direction = parts.length >= 2 && DIRECTION.test(parts[1]) ? parts[1] : "";
  const nameStart = direction ? 2 : 1;
  const streetNameWithSuffix = parts.slice(nameStart).join(" ");
  const streetName = stripStreetSuffix(streetNameWithSuffix);
  return { streetNum, direction, streetName };
}

function mapConditionCode(code: unknown): string | null {
  if (code == null) return null;
  const s = String(code).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n === 0 || n === 1) return null;
    const map: Record<number, string> = {
      2: "New / Rehabbed",
      3: "Above Average",
      4: "Average",
      5: "Below Average",
      6: "Vacant",
      7: "Sealed / Compromised",
    };
    return map[n] ?? null;
  }
  const validLabels = ["New / Rehabbed", "Above Average", "Average", "Below Average", "Vacant", "Sealed / Compromised"];
  if (validLabels.includes(s)) return s;
  return null;
}

/**
 * Get property details from Philadelphia OPA properties (opa_properties_public).
 */
export async function getPhiladelphiaPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  const raw = address.toUpperCase().trim();
  if (!raw) return null;

  const SELECT_COLS = "year_built, category_code_description, number_of_bedrooms, number_of_bathrooms, number_stories, total_livable_area, market_value, exterior_condition, interior_condition, sale_price, sale_date, building_code_description, central_air, garage_spaces, quality_grade, zoning";

  async function queryOPA(sql: string): Promise<Record<string, unknown>[]> {
    const url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(sql)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { rows?: Record<string, unknown>[] };
    return data.rows ?? [];
  }

  try {
    let rows = await queryOPA(
      `SELECT ${SELECT_COLS} FROM opa_properties_public WHERE location = '${escapeSql(raw)}' LIMIT 1`
    );

    if (rows.length === 0) {
      const noSuffix = stripStreetSuffix(raw);
      if (noSuffix && noSuffix !== raw) {
        rows = await queryOPA(
          `SELECT ${SELECT_COLS} FROM opa_properties_public WHERE location LIKE '${escapeSql(noSuffix)}%' LIMIT 1`
        );
      }
    }

    if (rows.length === 0) {
      const { streetNum, direction, streetName } = parsePhillyAddress(raw);
      if (streetNum && streetName) {
        const prefix = direction
          ? `${escapeSql(streetNum)} ${escapeSql(direction)} ${escapeSql(streetName)}`
          : `${escapeSql(streetNum)} ${escapeSql(streetName)}`;
        rows = await queryOPA(
          `SELECT ${SELECT_COLS} FROM opa_properties_public WHERE location LIKE '${prefix}%' LIMIT 1`
        );
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
      property_type: categoryDesc,
      square_footage: safeNumber(row.total_livable_area),
      bedrooms: safeNumber(row.number_of_bedrooms),
      bathrooms: safeNumber(row.number_of_bathrooms),
      stories: safeNumber(row.number_stories),
      exterior_condition: mapConditionCode(row.exterior_condition),
      interior_condition: mapConditionCode(row.interior_condition),
      units,
      market_value: safeNumber(row.market_value),
      sale_price: safeNumber(row.sale_price),
      sale_date: safeString(row.sale_date),
      building_description: safeString(row.building_code_description),
      central_air: row.central_air === "Y" ? true : row.central_air === "N" ? false : null,
      garage_spaces: safeNumber(row.garage_spaces),
      quality_grade: safeString(row.quality_grade),
      zoning: safeString(row.zoning),
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
