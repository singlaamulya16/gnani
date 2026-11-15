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

async function main() {
  const mode = await initDb();
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
