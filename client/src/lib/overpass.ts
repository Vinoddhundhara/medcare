/**
 * Client-side hospital data fetcher.
 * Strategy: race all Overpass servers simultaneously → first valid response wins.
 * Fallback: Nominatim if all Overpass servers fail.
 * Cache: 5 min in-memory.
 */

export interface NearbyHospital {
  id: string;
  osmId: number;
  osmType: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  emergency: boolean | null;
  openingHours: string | null;
  wheelchair: string | null;
  distance: number;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_SERVERS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// ─── Haversine ────────────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Normalize OSM element → NearbyHospital ───────────────────────────────────

function extractAddress(tags: Record<string, string>): string | null {
  const p: string[] = [];
  if (tags["addr:housenumber"]) p.push(tags["addr:housenumber"]);
  if (tags["addr:street"])      p.push(tags["addr:street"]);
  if (tags["addr:city"])        p.push(tags["addr:city"]);
  if (tags["addr:state"])       p.push(tags["addr:state"]);
  if (tags["addr:postcode"])    p.push(tags["addr:postcode"]);
  return p.length ? p.join(", ") : null;
}

function normalizeElement(
  el: OverpassElement,
  userLat: number,
  userLng: number
): NearbyHospital | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  // Strict guard: must be finite numbers in valid coordinate ranges
  if (
    lat == null || lon == null ||
    !isFinite(lat) || !isFinite(lon) ||
    isNaN(lat) || isNaN(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) return null;

  const tags = el.tags ?? {};
  const ev = tags["emergency"];
  return {
    id: `${el.type}-${el.id}`,
    osmId: el.id,
    osmType: el.type,
    name: tags["name:en"] || tags["name"] || tags["official_name"] || "Unnamed Hospital",
    latitude: lat,
    longitude: lon,
    address:      extractAddress(tags),
    phone:        tags["phone"] || tags["contact:phone"] || tags["telephone"] || null,
    website:      tags["website"] || tags["contact:website"] || tags["url"] || null,
    emergency:    ev === "yes" ? true : ev === "no" ? false : null,
    openingHours: tags["opening_hours"] || null,
    wheelchair:   tags["wheelchair"] || null,
    distance: Math.round(haversineKm(userLat, userLng, lat, lon) * 100) / 100,
  };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function scoreCompleteness(h: NearbyHospital): number {
  return [h.address, h.phone, h.website, h.openingHours, h.emergency !== null]
    .filter(Boolean).length;
}

function deduplicate(list: NearbyHospital[]): NearbyHospital[] {
  const seenIds = new Set<string>();
  const byName  = new Map<string, NearbyHospital>();
  const result: NearbyHospital[] = [];

  for (const h of list) {
    if (seenIds.has(h.id)) continue;
    seenIds.add(h.id);

    const key = h.name.toLowerCase().trim();
    const existing = byName.get(key);
    if (existing) {
      const d = haversineKm(existing.latitude, existing.longitude, h.latitude, h.longitude);
      if (d <= 0.12) { // 120 m → same building
        if (scoreCompleteness(h) > scoreCompleteness(existing)) {
          const idx = result.findIndex((r) => r.id === existing.id);
          if (idx >= 0) result[idx] = h;
          byName.set(key, h);
        }
        continue;
      }
    }
    byName.set(key, h);
    result.push(h);
  }
  return result;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry { data: NearbyHospital[]; exp: number }
const _cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number, radius: number) {
  // Round to ~100 m precision
  return `${Math.round(lat * 1000)}_${Math.round(lng * 1000)}_${radius}`;
}

// ─── Single Overpass server attempt ──────────────────────────────────────────

async function tryOverpassServer(
  server: string,
  body: string,
  signal: AbortSignal
): Promise<OverpassResponse> {
  const res = await fetch(server, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as OverpassResponse;
  if (!Array.isArray(json?.elements)) throw new Error("bad shape");
  return json;
}

// ─── Race all Overpass servers ────────────────────────────────────────────────
// Fires all servers at once. Returns the first valid response.
// All losers are aborted automatically.

async function fetchFromOverpass(
  userLat: number,
  userLng: number,
  radiusKm: number,
  outerSignal?: AbortSignal
): Promise<NearbyHospital[]> {
  const radiusM = radiusKm * 1000;
  // Comprehensive query: nodes + ways for both amenity and healthcare tags
  const query =
    `[out:json][timeout:14];` +
    `(` +
    `node["amenity"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `way["amenity"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `relation["amenity"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `node["healthcare"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `way["healthcare"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `relation["healthcare"="hospital"](around:${radiusM},${userLat},${userLng});` +
    `node["amenity"="clinic"](around:${radiusM},${userLat},${userLng});` +
    `way["amenity"="clinic"](around:${radiusM},${userLat},${userLng});` +
    `);out center tags;`;
  const body = `data=${encodeURIComponent(query)}`;

  // Per-server abort controllers — let us cancel losers
  const controllers = OVERPASS_SERVERS.map(() => new AbortController());

  // If outer signal aborts, cancel all
  outerSignal?.addEventListener("abort", () => {
    controllers.forEach((c) => c.abort());
  });

  // 18s hard timeout that cancels everything
  const hardTimer = setTimeout(() => controllers.forEach((c) => c.abort()), 18_000);

  const attempts = OVERPASS_SERVERS.map((server, i) =>
    tryOverpassServer(server, body, controllers[i].signal).then((json) => {
      // Cancel the other servers — we have a winner
      controllers.forEach((c, j) => { if (j !== i) c.abort(); });
      clearTimeout(hardTimer);
      return json;
    })
  );

  // Promise.any = resolve on first success, reject only if ALL fail
  let json: OverpassResponse;
  try {
    json = await Promise.any(attempts);
  } catch {
    clearTimeout(hardTimer);
    throw new Error("All Overpass servers failed or timed out");
  }

  return json.elements
    .map((el) => normalizeElement(el, userLat, userLng))
    .filter((h): h is NearbyHospital => h !== null);
}

// ─── Nominatim fallback ───────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  address?: {
    road?: string; suburb?: string; city?: string;
    state?: string; postcode?: string;
  };
}

async function fetchFromNominatim(
  userLat: number,
  userLng: number,
  radiusKm: number
): Promise<NearbyHospital[]> {
  // Degree offset ≈ 0.009 per km
  const delta = radiusKm * 0.009;
  const bbox  = `${userLng - delta},${userLat - delta},${userLng + delta},${userLat + delta}`;

  // Two parallel queries — hospital + clinic
  const makeUrl = (q: string) =>
    `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=40&viewbox=${bbox}&bounded=1&addressdetails=1`;

  const [r1, r2] = await Promise.allSettled([
    fetch(makeUrl("hospital"), { headers: { "Accept-Language": "en" } }).then((r) => r.json() as Promise<NominatimResult[]>),
    fetch(makeUrl("clinic"),   { headers: { "Accept-Language": "en" } }).then((r) => r.json() as Promise<NominatimResult[]>),
  ]);

  const items: NominatimResult[] = [
    ...(r1.status === "fulfilled" ? r1.value : []),
    ...(r2.status === "fulfilled" ? r2.value : []),
  ];

  return items.map((r): NearbyHospital | null => {
    const lat  = parseFloat(r.lat);
    const lon  = parseFloat(r.lon);
    // Skip records with invalid coordinates
    if (!isFinite(lat) || !isFinite(lon) || isNaN(lat) || isNaN(lon)) return null;
    const addr = r.address;
    const parts = [addr?.road, addr?.suburb, addr?.city, addr?.state, addr?.postcode].filter(Boolean);
    return {
      id: `${r.osm_type}-${r.osm_id}`,
      osmId: r.osm_id,
      osmType: r.osm_type,
      name: r.display_name.split(",")[0].trim(),
      latitude: lat,
      longitude: lon,
      address: parts.length ? parts.join(", ") : null,
      phone: null, website: null, emergency: null,
      openingHours: null, wheelchair: null,
      distance: Math.round(haversineKm(userLat, userLng, lat, lon) * 100) / 100,
    };
  })
  .filter((h): h is NearbyHospital => h !== null && h.distance <= radiusKm);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchNearbyHospitals(
  userLat: number,
  userLng: number,
  radiusKm: number,
  signal?: AbortSignal
): Promise<NearbyHospital[]> {
  const key    = cacheKey(userLat, userLng, radiusKm);
  const cached = _cache.get(key);
  if (cached && Date.now() < cached.exp) {
    console.log("[Cache] hit");
    return cached.data;
  }

  let raw: NearbyHospital[] = [];

  try {
    raw = await fetchFromOverpass(userLat, userLng, radiusKm, signal);
    console.log(`[Overpass] ${raw.length} raw results`);
  } catch (err) {
    if (signal?.aborted) throw new Error("Request cancelled");
    console.warn("[Overpass] failed → Nominatim fallback");
    try {
      raw = await fetchFromNominatim(userLat, userLng, radiusKm);
      console.log(`[Nominatim] ${raw.length} results`);
    } catch {
      throw new Error(
        "Could not load hospital data. Please check your internet connection and try again."
      );
    }
  }

  const result = deduplicate(raw).sort((a, b) => a.distance - b.distance);
  _cache.set(key, { data: result, exp: Date.now() + 5 * 60 * 1000 });
  return result;
}
