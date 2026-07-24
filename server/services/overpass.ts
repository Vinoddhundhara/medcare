/**
 * Overpass API service for querying nearby hospitals via OpenStreetMap.
 * No API key required. Uses public Overpass servers with automatic fallback.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

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
  distance: number; // km
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

// ─── Overpass Servers (with fallback) ────────────────────────────────────────

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const REQUEST_TIMEOUT_MS = 20_000; // 20 seconds per server

// ─── Simple in-memory cache ───────────────────────────────────────────────────
// Key: "lat_lng_radius" (rounded to 3 decimal places)
// TTL: 5 minutes

interface CacheEntry {
  data: NearbyHospital[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function makeCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 3 decimal places (~111m precision) to allow cache reuse for nearby requests
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;
  return `${rLat}_${rLng}_${radius}`;
}

function getFromCache(key: string): NearbyHospital[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: NearbyHospital[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  // Clean up old entries to avoid memory leaks
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
}

// ─── Haversine Distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Tag Extraction Helpers ───────────────────────────────────────────────────

function extractAddress(tags: Record<string, string>): string | null {
  const parts: string[] = [];
  if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  if (tags["addr:street"]) parts.push(tags["addr:street"]);
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (tags["addr:state"]) parts.push(tags["addr:state"]);
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractPhone(tags: Record<string, string>): string | null {
  return tags["phone"] || tags["contact:phone"] || tags["telephone"] || null;
}

function extractWebsite(tags: Record<string, string>): string | null {
  return tags["website"] || tags["contact:website"] || tags["url"] || null;
}

function extractName(tags: Record<string, string>): string {
  return tags["name:en"] || tags["name"] || tags["official_name"] || "Unnamed Hospital";
}

function extractEmergency(tags: Record<string, string>): boolean | null {
  const val = tags["emergency"];
  if (val === "yes") return true;
  if (val === "no") return false;
  return null;
}

function normalizeHospitalName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

// ─── Normalize OSM element → NearbyHospital ──────────────────────────────────

function normalizeElement(
  el: OverpassElement,
  userLat: number,
  userLng: number
): NearbyHospital | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = el.tags ?? {};
  const name = extractName(tags);

  return {
    id: `${el.type}-${el.id}`,
    osmId: el.id,
    osmType: el.type,
    name,
    latitude: lat,
    longitude: lon,
    address: extractAddress(tags),
    phone: extractPhone(tags),
    website: extractWebsite(tags),
    emergency: extractEmergency(tags),
    openingHours: tags["opening_hours"] || null,
    wheelchair: tags["wheelchair"] || null,
    distance: Math.round(haversineKm(userLat, userLng, lat, lon) * 100) / 100,
  };
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────
/**
 * Removes duplicates by:
 * 1. Stable ID (osmType-osmId) — same OSM object appearing multiple times
 * 2. Same normalized name within 100m — same real-world hospital queried as both node + way
 *
 * We do NOT merge hospitals that merely share a common word (e.g. "City Hospital" vs "City General Hospital").
 * We require EXACT normalized name match to avoid incorrectly merging different hospitals.
 */
function deduplicateHospitals(hospitals: NearbyHospital[]): NearbyHospital[] {
  const seenIds = new Set<string>();
  const seenNameCoords = new Map<string, NearbyHospital>();
  const result: NearbyHospital[] = [];

  for (const h of hospitals) {
    // 1. Skip if exact same OSM ID
    if (seenIds.has(h.id)) continue;
    seenIds.add(h.id);

    // 2. Check for same name + very close coordinates (≤100m ≈ 0.001 degrees)
    const normName = normalizeHospitalName(h.name);
    const existing = seenNameCoords.get(normName);

    if (existing) {
      const distBetween = haversineKm(
        existing.latitude,
        existing.longitude,
        h.latitude,
        h.longitude
      );
      // Only deduplicate if within 100 meters (same physical building)
      if (distBetween <= 0.1) {
        // Keep the one with more data (longer address, phone, etc.)
        const existingScore = scoreCompleteness(existing);
        const newScore = scoreCompleteness(h);
        if (newScore > existingScore) {
          // Replace existing with richer one
          const idx = result.findIndex((r) => r.id === existing.id);
          if (idx >= 0) result[idx] = h;
          seenNameCoords.set(normName, h);
        }
        continue;
      }
    }

    seenNameCoords.set(normName, h);
    result.push(h);
  }

  return result;
}

function scoreCompleteness(h: NearbyHospital): number {
  let score = 0;
  if (h.address) score++;
  if (h.phone) score++;
  if (h.website) score++;
  if (h.openingHours) score++;
  if (h.emergency !== null) score++;
  return score;
}

// ─── Overpass Query Builder ───────────────────────────────────────────────────

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  // Query both amenity=hospital and healthcare=hospital for maximum coverage
  return `
[out:json][timeout:15];
(
  node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
  node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
  way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
  relation["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function fetchNearbyHospitals(
  userLat: number,
  userLng: number,
  radiusKm: number
): Promise<NearbyHospital[]> {
  const cacheKey = makeCacheKey(userLat, userLng, radiusKm);
  const cached = getFromCache(cacheKey);
  if (cached) {
    // cache hit – silent
    return cached;
  }

  const radiusMeters = radiusKm * 1000;
  const query = buildOverpassQuery(userLat, userLng, radiusMeters);
  const body = `data=${encodeURIComponent(query)}`;

  let lastError: Error | null = null;

  for (const serverUrl of OVERPASS_SERVERS) {
    try {
      // trying server – silent

      const response = await fetchWithTimeout(
        serverUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
        REQUEST_TIMEOUT_MS
      );

      if (response.status === 429) {
        console.warn(`[Overpass] Rate limited (429) by ${serverUrl}, trying next...`);
        lastError = new Error("Rate limited");
        continue;
      }

      if (response.status === 502 || response.status === 503) {
        console.warn(`[Overpass] Server unavailable (${response.status}) at ${serverUrl}, trying next...`);
        lastError = new Error(`Server unavailable: ${response.status}`);
        continue;
      }

      if (!response.ok) {
        console.warn(`[Overpass] HTTP ${response.status} from ${serverUrl}, trying next...`);
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      const data: OverpassResponse = await response.json();

      if (!data || !Array.isArray(data.elements)) {
        console.warn(`[Overpass] Invalid response shape from ${serverUrl}`);
        lastError = new Error("Invalid response");
        continue;
      }

      // Normalize all elements
      const hospitals: NearbyHospital[] = data.elements
        .map((el) => normalizeElement(el, userLat, userLng))
        .filter((h): h is NearbyHospital => h !== null);

      // Remove duplicates and sort by distance
      const deduped = deduplicateHospitals(hospitals);
      deduped.sort((a, b) => a.distance - b.distance);

      // result logged silently

      setInCache(cacheKey, deduped);
      return deduped;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Overpass] Error from ${serverUrl}: ${message}`);
      lastError = new Error(message);
      // Continue to next server
    }
  }

  // All servers failed
  const errorMsg = lastError?.message ?? "Unknown error";
  console.error(`[Overpass] All servers failed. Last error: ${errorMsg}`);
  throw new Error("Unable to reach hospital data service. Please try again later.");
}
