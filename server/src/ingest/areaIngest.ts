import { config } from '../config.js';
import { getArea, touchArea, upsertNormalized } from '../db/client.js';
import { fetchOverpassAround } from '../overpass/client.js';
import { normalizeOverpassResponse } from '../overpass/normalize.js';
import { areaKey } from '../overpass/query.js';

const ingesting = new Set<string>();
/** Cooldown after a failed Overpass pull so the UI is not stuck refreshing. */
const failedAt = new Map<string, number>();
const FAIL_COOLDOWN_MS = 45_000;

function stale(iso: string): boolean {
  const ageMs = Date.now() - new Date(iso).getTime();
  return ageMs > config.placesRefreshDays * 86400000;
}

export async function ensureAreaIngested(
  lat: number,
  lng: number,
  radiusM = 10_000,
): Promise<{ key: string; refreshing: boolean }> {
  const key = areaKey(lat, lng);
  const existing = await getArea(key);
  await touchArea(key, lat, lng, radiusM, false);

  const lastFail = failedAt.get(key);
  if (lastFail && Date.now() - lastFail < FAIL_COOLDOWN_MS) {
    return { key, refreshing: false };
  }

  const needsFetch = !existing || stale(existing.lastSyncedAt);
  if (!needsFetch) return { key, refreshing: false };
  if (ingesting.has(key)) return { key, refreshing: true };

  ingesting.add(key);
  void (async () => {
    try {
      const raw = await fetchOverpassAround(lat, lng, radiusM);
      const places = normalizeOverpassResponse(raw);
      await upsertNormalized(places, key);
      await touchArea(key, lat, lng, radiusM, true);
      failedAt.delete(key);
      console.log(`[ingest] ${key}: ${places.length} places from Overpass`);
    } catch (err) {
      failedAt.set(key, Date.now());
      console.error(`[ingest] failed ${key}`, err instanceof Error ? err.message : err);
    } finally {
      ingesting.delete(key);
    }
  })();

  return { key, refreshing: true };
}

export function isAreaRefreshing(lat: number, lng: number): boolean {
  return ingesting.has(areaKey(lat, lng));
}
