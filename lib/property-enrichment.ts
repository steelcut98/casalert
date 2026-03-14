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

/** Map Cook County property_class to readable type */
function mapChicagoPropertyClass(className: unknown): string | null {
  const s = safeString(className);
  if (!s) return null;
  const c = s.toUpperCase();
  if (c.includes("SINGLE") || c.includes("RESIDENCE")) return "Single family";
  if (c.includes("2") && c.includes("4")) return "2-4 units";
  if (c.includes("5") || c.includes("APARTMENT") || c.includes("MULTI")) return "Multi-family";
  if (c.includes("CONDO") || c.includes("CONDOMINIUM")) return "Condo";
  if (c.includes("COMMERCIAL") || c.includes("INDUSTRIAL")) return "Commercial";
  return s;
}

const COOK_COUNTY_URL = "https://datacatalog.cookcountyil.gov/resource/bcnq-qi2z.json";
const CHICAGO_PERMITS_URL = "https://data.cityofchicago.org/resource/ydr8-5enu.json";

/**
 * Get property details from Cook County Assessor (Socrata) with fallback to Chicago building permits.
 */
export async function getChicagoPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  const normalized = normalizeAddressForQuery(address);
  if (!normalized) return null;

  const escapedForWhere = normalized.replace(/'/g, "''");
  const where = `lower(property_address) like lower('%${escapedForWhere}%')`;

  try {
    const params = new URLSearchParams({ $where: where, $limit: "5" });
    const url = `${COOK_COUNTY_URL}?${params.toString()}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || data.length === 0) {
      return await chicagoFallbackPermits(normalized);
    }
    const row = data[0] as Record<string, unknown>;
    return {
      year_built: safeNumber(row.year_built ?? row.yearbuilt ?? row.building_year),
      units: safeNumber(row.no_of_units ?? row.units ?? row.residential_units ?? row.number_of_units),
      square_footage: safeNumber(row.building_sqft ?? row.sqft ?? row.building_square_footage ?? row.total_building_area),
      assessed_value: safeNumber(row.assessed_value ?? row.total_assessed_value ?? row.market_value),
      property_type: mapChicagoPropertyClass(row.property_class ?? row.class ?? row.classification),
      lot_size: safeNumber(row.lot_sqft ?? row.lot_size ?? row.lot_square_feet),
    };
  } catch {
    try {
      return await chicagoFallbackPermits(normalized);
    } catch {
      return null;
    }
  }
}

async function chicagoFallbackPermits(normalizedAddress: string): Promise<PropertyEnrichment | null> {
  const escaped = normalizedAddress.replace(/'/g, "''");
  const where = `lower(street_number || ' ' || street_direction || ' ' || street_name) like lower('%${escaped}%')`;
  const params = new URLSearchParams({ $where: where, $limit: "1" });
  const url = `${CHICAGO_PERMITS_URL}?${params.toString()}`;
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>[];
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    year_built: null,
    units: null,
    square_footage: null,
    assessed_value: null,
    property_type: null,
    lot_size: null,
  };
}

const PHILLY_CARTO_URL = "https://phl.carto.com/api/v2/sql";

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

/**
 * Get property details from Philadelphia OPA (Carto SQL API).
 */
export async function getPhiladelphiaPropertyDetails(address: string): Promise<PropertyEnrichment | null> {
  const normalized = normalizeAddressForQuery(address);
  if (!normalized) return null;

  const escaped = escapeSql(normalized);

  try {
    const exactSql = `SELECT market_value, sale_price, sale_date, year_built, number_of_rooms, number_stories, total_livable_area, exterior_condition, interior_condition, category_code_description FROM opa_properties_public WHERE location = upper('${escaped}') LIMIT 1`;
    let url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(exactSql)}`;
    let res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    let data = (await res.json()) as { rows?: Record<string, unknown>[] };
    let rows = data.rows ?? [];

    if (rows.length === 0) {
      const likeSql = `SELECT market_value, sale_price, sale_date, year_built, number_of_rooms, number_stories, total_livable_area, exterior_condition, interior_condition, category_code_description FROM opa_properties_public WHERE location LIKE upper('%${escaped}%') LIMIT 1`;
      url = `${PHILLY_CARTO_URL}?q=${encodeURIComponent(likeSql)}`;
      res = await fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      data = (await res.json()) as { rows?: Record<string, unknown>[] };
      rows = data.rows ?? [];
    }

    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    const categoryDesc = safeString(row.category_code_description);

    let units: number | null = null;
    if (categoryDesc && /\d+\s*unit|multi|apartment|condo/i.test(categoryDesc)) {
      const match = categoryDesc.match(/(\d+)\s*unit/i);
      units = match ? safeNumber(match[1]) : null;
    }

    return {
      year_built: safeNumber(row.year_built),
      units,
      square_footage: safeNumber(row.total_livable_area),
      assessed_value: safeNumber(row.market_value),
      property_type: categoryDesc,
      lot_size: null,
    };
  } catch {
    return null;
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
