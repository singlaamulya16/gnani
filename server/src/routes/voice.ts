/**
 * Gnani voice proxy. Keys stay on the server.
 *
 *   GET  /api/voice/status  -> { gnani: boolean, stt, tts }
 *   POST /api/voice/stt     body: raw audio (audio/wav), query ?lang=hi|en  -> { transcript, detectedLanguage }
 *   POST /api/voice/tts     body: { text, lang }                             -> audio/wav
 *
 * Docs: https://docs.gnani.ai/api/introduction/quick-start
 *   STT  POST https://api.vachana.ai/stt/v3                (multipart, Prisma)
 *   TTS  POST https://api.vachana.ai/api/v1/tts/inference  (JSON, Timbre)
 *   Auth header: X-API-Key-ID
 */
import express, { Router } from 'express';
import { config } from '../config.js';

export const voiceRouter = Router();

/** Prisma accepts 1-4 comma-separated codes on v3.0, which handles Hinglish well. */
function sttLanguageFor(lang: string): string {
  if (config.gnaniSttLanguage) return config.gnaniSttLanguage;
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('hi')) return 'hi-IN,en-IN';
  if (l.startsWith('en')) return 'en-IN,hi-IN';
  // regional: e.g. "ta" -> "ta-IN,en-IN"
  return `${l.slice(0, 2)}-IN,en-IN`;
}

/** Timbre v2.5 voices are tied to one language (see Voice Catalog). */
function ttsVoiceFor(lang: string): { voice: string; language: string } {
  const l = (lang || 'en').toLowerCase();
  if (l === 'hi-en' || l === 'hinglish') return { voice: config.gnaniVoiceHinglish, language: 'hi-en' };
  if (l.startsWith('hi')) return { voice: config.gnaniVoiceHi, language: 'hi-IN' };
  return { voice: config.gnaniVoiceEn, language: 'en-IN' };
}

const KEYTERMS = [
  'hospital',
  'ambulance',
  'blood',
  'donor',
  'pharmacy',
  'medicine',
  'doctor',
  'clinic',
  'B positive',
  'O negative',
  'AB positive',
  'Rohini',
  'emergency',
  'chahiye',
];

voiceRouter.get('/status', (_req, res) => {
  res.json({
    gnani: Boolean(config.gnaniApiKey),
    stt: config.gnaniSttModel,
    tts: config.gnaniTtsModel,
  });
});

async function callPrisma(audio: Buffer, mime: string, language: string, withKeyterms: boolean) {
  const form = new FormData();
  const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : mime.includes('mp') ? 'mp3' : 'wav';
  form.append('audio_file', new Blob([audio], { type: mime || 'audio/wav' }), `speech.${ext}`);
  form.append('model', config.gnaniSttModel);
  form.append('language_code', language);
  if (withKeyterms) form.append('keyterms', JSON.stringify(KEYTERMS));
  return fetch(`${config.gnaniBaseUrl}/stt/v3`, {
    method: 'POST',
    headers: { 'X-API-Key-ID': config.gnaniApiKey },
    body: form,
  });
}

voiceRouter.post(
  '/stt',
  express.raw({ type: () => true, limit: '12mb' }),
  async (req, res) => {
    if (!config.gnaniApiKey) {
      res.status(503).json({ error: 'GNANI_API_KEY not set on server' });
      return;
    }
    const audio = req.body as Buffer;
    if (!audio || !audio.length) {
      res.status(400).json({ error: 'Empty audio' });
      return;
    }
    const mime = String(req.headers['content-type'] || 'audio/wav');
    const language = sttLanguageFor(String(req.query.lang || 'en'));
    try {
      let r = await callPrisma(audio, mime, language, true);
      // If keyterms are rejected, retry plain once.
      if (r.status === 400) r = await callPrisma(audio, mime, language, false);
      const data = (await r.json().catch(() => ({}))) as {
        success?: boolean;
        transcript?: string;
        detected_language_code?: string;
        error?: { type?: string; message?: string };
        detail?: unknown;
      };
      if (!r.ok || data.success === false) {
        console.error('[voice/stt] gnani error', r.status, JSON.stringify(data));
        res.status(r.status >= 400 ? r.status : 502).json({ error: data.error ?? data.detail ?? 'STT failed' });
        return;
      }
      res.json({
        transcript: data.transcript ?? '',
        detectedLanguage: data.detected_language_code ?? null,
        provider: 'gnani-prisma',
      });
    } catch (err) {
      console.error('[voice/stt]', err);
      res.status(502).json({ error: 'Could not reach Gnani STT' });
    }
  },
);

voiceRouter.post('/tts', async (req, res) => {
  if (!config.gnaniApiKey) {
    res.status(503).json({ error: 'GNANI_API_KEY not set on server' });
    return;
  }
  const text = String(req.body?.text ?? '').trim().slice(0, 600);
  if (!text) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }
  const { voice, language } = ttsVoiceFor(String(req.body?.lang ?? 'en'));
  try {
    const r = await fetch(`${config.gnaniBaseUrl}/api/v1/tts/inference`, {
      method: 'POST',
      headers: { 'X-API-Key-ID': config.gnaniApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        model: config.gnaniTtsModel,
        language,
        speed: 1.0,
        audio_config: {
          sample_rate: 24000,
          num_channels: 1,
          sample_width: 2,
          encoding: 'linear_pcm',
          container: 'wav',
        },
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[voice/tts] gnani error', r.status, body.slice(0, 500));
      res.status(r.status).json({ error: 'TTS failed', detail: body.slice(0, 300) });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/wav');
    res.setHeader('X-Voice', voice);
    res.send(buf);
  } catch (err) {
    console.error('[voice/tts]', err);
    res.status(502).json({ error: 'Could not reach Gnani TTS' });
  }
});
