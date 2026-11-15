/**
 * Loads real OpenStreetMap snapshots from server/data/*.json (raw Overpass JSON)
 * so the app always has nearby places even when public Overpass mirrors are down.
 * Live Overpass ingest still runs and adds/updates places on top.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertNormalized } from '../db/client.js';
import { normalizeOverpassResponse } from '../overpass/normalize.js';
import type { OverpassResponse } from '../overpass/types.js';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

export async function loadSnapshots(): Promise<number> {
  if (!fs.existsSync(dataDir)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as OverpassResponse;
      const places = normalizeOverpassResponse(raw);
      await upsertNormalized(places, `snapshot:${file}`);
      total += places.length;
      console.log(`[snapshot] ${file}: ${places.length} places`);
    } catch (err) {
      console.warn(`[snapshot] failed ${file}`, err instanceof Error ? err.message : err);
    }
  }
  return total;
}
