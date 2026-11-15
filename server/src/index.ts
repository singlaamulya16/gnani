import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { startNightlyScheduler } from './jobs/nightly.js';
import { adminRouter } from './routes/admin.js';
import { ambulancesRouter } from './routes/ambulances.js';
import { emergencyRouter } from './routes/emergency.js';
import { placesRouter } from './routes/places.js';
import { registerRouter } from './routes/register.js';
import { streamRouter } from './routes/stream.js';
import { voiceRouter } from './routes/voice.js';
import { loadSnapshots } from './ingest/snapshot.js';

async function main() {
  const mode = await initDb();
  await loadSnapshots();
  const app = express();
  app.use(cors());
  // Voice routes first: /stt needs the raw audio body, not JSON.
  app.use('/api/voice', express.json({ limit: '64kb' }), voiceRouter);
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      store: mode,
      overpass: config.overpassEndpoints.length,
      mappls: config.enableMappls,
      google: config.enableGoogle,
      gnani: Boolean(config.gnaniApiKey),
    });
  });

  // Dev helper: save a raw Overpass snapshot (localhost only) into server/data/.
  app.post('/api/dev/snapshot', express.json({ limit: '5mb' }), (req, res) => {
    const ip = req.socket.remoteAddress ?? '';
    if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) {
      res.status(403).end();
      return;
    }
    const name = String(req.query.name ?? 'snapshot').replace(/[^a-z0-9-]/gi, '');
    const els = (req.body as { elements?: unknown[] })?.elements;
    if (!Array.isArray(els) || !els.length) {
      res.status(400).json({ error: 'elements required' });
      return;
    }
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `osm-${name}.json`), JSON.stringify({ elements: els }));
    res.json({ ok: true, saved: els.length });
  });

  app.use('/api/places', placesRouter);
  app.use('/api/register', registerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/emergency-numbers', emergencyRouter);
  app.use('/api/ambulances', ambulancesRouter);
  app.use('/api/stream', streamRouter);

  app.listen(config.port, () => {
    console.log(`[helpme-server] http://localhost:${config.port} (store=${mode})`);
  });

  startNightlyScheduler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
