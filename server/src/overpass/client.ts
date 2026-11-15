import { config } from '../config.js';
import type { OverpassResponse } from './types.js';
import { buildAroundQuery } from './query.js';

const inFlight = new Map<string, Promise<OverpassResponse>>();

export async function fetchOverpassAround(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<OverpassResponse> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(radiusM)}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  // Race all mirrors in parallel; first good answer wins. Public Overpass is often 502/slow.
  const task = (async () => {
    const body = buildAroundQuery(lat, lng, radiusM);
    const controllers: AbortController[] = [];
    const attempts = config.overpassEndpoints.map(async (endpoint) => {
      const ctrl = new AbortController();
      controllers.push(ctrl);
      const timer = setTimeout(() => ctrl.abort(), 35_000);
      try {
        console.log(`[overpass] try ${endpoint}`);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': config.userAgent,
          },
          body: `data=${encodeURIComponent(body)}`,
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Overpass HTTP ${res.status} from ${endpoint}`);
        const json = (await res.json()) as OverpassResponse;
        console.log(`[overpass] ok ${endpoint} elements=${json.elements?.length ?? 0}`);
        return json;
      } finally {
        clearTimeout(timer);
      }
    });
    try {
      return await Promise.any(attempts);
    } catch {
      throw new Error('All Overpass mirrors failed');
    } finally {
      controllers.forEach((c) => c.abort());
    }
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
