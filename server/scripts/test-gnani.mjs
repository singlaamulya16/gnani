// Quick check that your Gnani key works: Timbre speaks a line, Prisma transcribes it back.
// Run from the server folder:  node scripts/test-gnani.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const f of [path.join(root, '.env'), path.join(root, 'server', '.env')]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const KEY = process.env.GNANI_API_KEY;
const BASE = process.env.GNANI_BASE_URL || 'https://api.vachana.ai';
if (!KEY) {
  console.error('GNANI_API_KEY missing in .env');
  process.exit(1);
}

const text = 'B positive blood chahiye, Rohini ke paas.';
console.log('1) Timbre TTS ->', text);
const tts = await fetch(`${BASE}/api/v1/tts/inference`, {
  method: 'POST',
  headers: { 'X-API-Key-ID': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text,
    voice: process.env.GNANI_VOICE_HINGLISH || 'Poorvi',
    model: process.env.GNANI_TTS_MODEL || 'timbre-v2.5',
    language: 'hi-en',
    speed: 1.0,
    audio_config: { sample_rate: 16000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' },
  }),
});
if (!tts.ok) {
  console.error('   TTS failed', tts.status, await tts.text());
  process.exit(1);
}
const wav = Buffer.from(await tts.arrayBuffer());
fs.writeFileSync('gnani-test.wav', wav);
console.log(`   OK, ${wav.length} bytes saved to server/gnani-test.wav`);

console.log('2) Prisma STT on that audio');
const form = new FormData();
form.append('audio_file', new Blob([wav], { type: 'audio/wav' }), 'gnani-test.wav');
form.append('model', process.env.GNANI_STT_MODEL || 'prisma-v3.0');
form.append('language_code', 'hi-IN,en-IN');
const stt = await fetch(`${BASE}/stt/v3`, { method: 'POST', headers: { 'X-API-Key-ID': KEY }, body: form });
const out = await stt.json().catch(() => ({}));
if (!stt.ok) {
  console.error('   STT failed', stt.status, JSON.stringify(out));
  process.exit(1);
}
console.log('   Transcript:', out.transcript, '| detected:', out.detected_language_code);
console.log('\nGnani is working. Start the app.');
