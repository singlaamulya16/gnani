import { apiUrl } from '@/lib/api';
import { interpret as parseIntent, type ReplyLang } from './intent';
import { recordWav, stopRecording, isRecording } from './recorder';

export type VoiceToolName =
  | 'findBlood'
  | 'findPlaces'
  | 'requestAmbulance'
  | 'sendAlert'
  | 'switchLanguage';

export interface VoiceToolCall {
  name: VoiceToolName;
  args: Record<string, string>;
}

export interface VoiceResult {
  transcript: string;
  reply: string;
  replyLang: ReplyLang;
  tools: VoiceToolCall[];
}

export type VoiceProvider = 'gnani' | 'browser';

export interface VoiceService {
  /** Records until silence/tap, returns the transcript. */
  startListening(lang: string): Promise<string>;
  stopListening(): void;
  isListening(): boolean;
  speak(text: string, lang: string): Promise<void>;
  interpret(transcript: string, uiLang: string): VoiceResult;
  provider(): Promise<VoiceProvider>;
}

/* ---------------- provider detection ---------------- */

let providerPromise: Promise<VoiceProvider> | null = null;
function detectProvider(): Promise<VoiceProvider> {
  if (!providerPromise) {
    providerPromise = fetch(apiUrl('/api/voice/status'))
      .then((r) => (r.ok ? r.json() : { gnani: false }))
      .then((d: { gnani?: boolean }) => (d.gnani ? 'gnani' : 'browser') as VoiceProvider)
      .catch(() => 'browser' as VoiceProvider);
  }
  return providerPromise;
}

/* ---------------- browser fallback (dev only) ---------------- */

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecCtor = new () => SpeechRec;
let browserRec: SpeechRec | null = null;

function browserListen(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }
    const rec = new SR();
    browserRec = rec;
    rec.lang = lang.startsWith('hi') ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => resolve(ev.results[0]?.[0]?.transcript ?? '');
    rec.onerror = () => reject(new Error('Listening failed'));
    rec.onend = () => {
      browserRec = null;
    };
    rec.start();
  });
}

function browserSpeak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/* ---------------- Gnani (via our backend proxy) ---------------- */

async function gnaniListen(lang: string): Promise<string> {
  const wav = await recordWav();
  const r = await fetch(apiUrl(`/api/voice/stt?lang=${encodeURIComponent(lang)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: wav,
  });
  if (!r.ok) throw new Error(`STT failed (${r.status})`);
  const data = (await r.json()) as { transcript?: string };
  const text = (data.transcript ?? '').trim();
  if (!text) throw new Error('No speech detected');
  return text;
}

let currentAudio: HTMLAudioElement | null = null;

/** Stop anything currently playing (Gnani audio or browser voice). */
let speakSeq = 0;
let currentDone: (() => void) | null = null;

export function stopSpeaking() {
  speakSeq++;
  currentAudio?.pause();
  currentAudio = null;
  const done = currentDone;
  currentDone = null;
  done?.();
  window.speechSynthesis?.cancel();
}


async function gnaniSpeak(text: string, lang: string): Promise<void> {
  const seq = ++speakSeq;
  const r = await fetch(apiUrl('/api/voice/tts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!r.ok) throw new Error(`TTS failed (${r.status})`);
  const blob = await r.blob();
  if (seq !== speakSeq) return; // interrupted or superseded
  const url = URL.createObjectURL(blob);
  currentAudio?.pause();
  window.speechSynthesis?.cancel();
  const audio = new Audio(url);
  currentAudio = audio;
  await new Promise<void>((resolve) => {
    currentDone = resolve;
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
  if (currentDone) currentDone = null;
  URL.revokeObjectURL(url);
}

/* ---------------- public service ---------------- */

export const voiceService: VoiceService = {
  async startListening(lang) {
    return (await detectProvider()) === 'gnani' ? gnaniListen(lang) : browserListen(lang);
  },
  stopListening() {
    if (isRecording()) stopRecording();
    browserRec?.stop();
  },
  isListening() {
    return isRecording() || browserRec !== null;
  },
  async speak(text, lang) {
    // One voice only: Gnani Timbre when available. Never mix in the browser's (often male) voice.
    if ((await detectProvider()) === 'gnani') {
      try {
        await gnaniSpeak(text, lang);
      } catch (err) {
        console.warn('[voice] Gnani TTS failed (text still shown on screen)', err);
      }
      return;
    }
    stopSpeaking();
    await browserSpeak(text, lang);
  },
  interpret: parseIntent,
  provider: detectProvider,
};
