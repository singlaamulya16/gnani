/**
 * Adapters for production voice providers.
 * Keys must stay on the backend proxy — never call these from the browser with secrets.
 *
 * - Gnani Prisma → speech-to-text
 * - Gnani Timbre → text-to-speech
 * - LLM (Claude) → tool-calling helper
 *
 * LIVE implementation now lives in voiceService.ts + server/src/routes/voice.ts.
 * These interfaces are kept for reference only.
 */

export interface SttAdapter {
  transcribe(audio: Blob, language: string): Promise<string>;
}

export interface TtsAdapter {
  synthesize(text: string, language: string): Promise<Blob>;
}

export interface LlmToolAdapter {
  run(prompt: string, language: string): Promise<{
    reply: string;
    tools: Array<{ name: string; args: Record<string, string> }>;
  }>;
}

/** Placeholder — wire to POST /api/voice/stt (Gnani Prisma proxy). */
export const gnaniPrismaAdapter: SttAdapter = {
  async transcribe() {
    throw new Error('Gnani Prisma adapter: implement via backend proxy');
  },
};

/** Placeholder — wire to POST /api/voice/tts (Gnani Timbre proxy). */
export const gnaniTimbreAdapter: TtsAdapter = {
  async synthesize() {
    throw new Error('Gnani Timbre adapter: implement via backend proxy');
  },
};

/** Placeholder — wire to POST /api/ai/helper (LLM tool calling). */
export const llmHelperAdapter: LlmToolAdapter = {
  async run() {
    throw new Error('LLM adapter: implement via backend proxy');
  },
};
