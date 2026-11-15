/**
 * Mic capture -> 16 kHz mono 16-bit WAV (a format Gnani Prisma accepts).
 * Stops automatically after ~1.2 s of silence once speech was heard, after maxMs,
 * or when stopRecording() is called (tap again).
 */

let activeStop: (() => void) | null = null;

export function isRecording(): boolean {
  return activeStop !== null;
}

export function stopRecording(): void {
  activeStop?.();
}

export async function recordWav(opts: { maxMs?: number; silenceMs?: number } = {}): Promise<Blob> {
  const maxMs = opts.maxMs ?? 12000;
  const silenceMs = opts.silenceMs ?? 1200;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const inputRate = ctx.sampleRate;

  let heardSpeech = false;
  let lastLoud = performance.now();
  const startedAt = performance.now();

  return new Promise<Blob>((resolve, reject) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      activeStop = null;
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      const pcm = merge(chunks);
      if (pcm.length < inputRate * 0.3) {
        reject(new Error('Too short — hold on and speak again'));
        return;
      }
      resolve(encodeWav(downsample(pcm, inputRate, 16000), 16000));
    };
    activeStop = finish;

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      if (rms > 0.02) {
        heardSpeech = true;
        lastLoud = now;
      }
      if ((heardSpeech && now - lastLoud > silenceMs) || now - startedAt > maxMs) finish();
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  });
}

function merge(chunks: Float32Array[]): Float32Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function downsample(buf: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return buf;
  const ratio = from / to;
  const len = Math.floor(buf.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), buf.length);
    let s = 0;
    for (let j = start; j < end; j++) s += buf[j];
    out[i] = s / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
