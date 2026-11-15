import { Router } from 'express';
import { getPlaceById, searchPlaces } from '../db/client.js';
import { ensureAreaIngested, isAreaRefreshing } from '../ingest/areaIngest.js';
import { addReport } from '../db/client.js';
import type { PlaceSearchResult } from '../db/types.js';

export const placesRouter = Router();

const RADIUS_STEPS = [5000, 15000, 30000];

function toApiPlace(p: PlaceSearchResult) {
  return {
    id: p.id,
    source: p.source,
    sourceId: p.sourceId,
    kind: p.kind,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    phone: p.phone,
    openingHours: p.openingHours,
    open24x7: p.open24x7,
    // Never invent "open now" from missing hours
    openNow: p.open24x7 === true ? true : null,
    tags: p.tags,
    verified: p.verified,
    dataQuality: p.dataQuality,
    distanceM: Math.round(p.distanceM),
    distanceKm: Math.round((p.distanceM / 1000) * 10) / 10,
  };
}

placesRouter.get('/', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }

  const kindParam = String(req.query.kind ?? 'all');
  const kinds =
    kindParam === 'all' || !kindParam
      ? undefined
      : kindParam.split(',').map((k) => k.trim()).filter(Boolean);

  const openNow = String(req.query.openNow ?? '') === 'true';
  const q = req.query.q ? String(req.query.q) : undefined;
  const requestedRadius = req.query.radius ? Number(req.query.radius) : RADIUS_STEPS[0]!;

  const ingest = await ensureAreaIngested(lat, lng, 6_000);
  const refreshing = ingest.refreshing || isAreaRefreshing(lat, lng);

  let usedRadius = requestedRadius;
  let results: PlaceSearchResult[] = [];
  let widened = false;

  for (const step of RADIUS_STEPS) {
    const radius = Math.max(requestedRadius, step);
    results = await searchPlaces({
      lat,
      lng,
      radiusM: radius,
      kinds,
      openNow: openNow || undefined,
      q,
    });
    usedRadius = radius;
    if (results.length >= 3 || radius >= RADIUS_STEPS[RADIUS_STEPS.length - 1]!) break;
    if (results.length < 3 && radius < RADIUS_STEPS[RADIUS_STEPS.length - 1]!) {
      widened = true;
    }
  }

  const trulyWidened = widened && results.length > 0 && usedRadius > requestedRadius;

  res.json({
    places: results.map(toApiPlace),
    meta: {
      radiusM: usedRadius,
      widened: trulyWidened,
      message:
        refreshing && results.length === 0
          ? 'Finding help near you...'
          : trulyWidened
            ? 'Nearest options are farther away'
            : null,
      refreshing,
      ingestArea: ingest.key,
      attribution: '© OpenStreetMap contributors',
    },
  });
});

placesRouter.get('/:id', async (req, res) => {
  const place = await getPlaceById(req.params.id);
  if (!place) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    place: {
      ...toApiPlace({ ...place, distanceM: 0 }),
      distanceM: undefined,
      distanceKm: undefined,
    },
  });
});

placesRouter.post('/:id/report', async (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'message required' });
    return;
  }
  const place = await getPlaceById(req.params.id);
  if (!place) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const report = await addReport(place.id, message.slice(0, 500));
  res.status(201).json({ ok: true, reportId: report.id });
});
