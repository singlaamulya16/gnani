import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmergencyBanner, Icon } from '@/components/ui';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { voiceService } from '@/services/voice/voiceService';
import { useAppStore } from '@/store/appStore';

const suggestions = [
  { labelKey: 'voice.chipHospitals', text: 'show hospitals' },
  { labelKey: 'voice.chipBlood', text: 'B+ blood chahiye, 2 units' },
  { labelKey: 'voice.chipAmbulance', text: 'ambulance bulao' },
];

export function VoicePage() {
  const { t } = useTranslation();
  const { voiceState, toggleListen, runTranscript } = useVoiceCommand();
  const transcript = useAppStore((s) => s.voiceTranscript);
  const reply = useAppStore((s) => s.voiceReply);
  const [typed, setTyped] = useState('');
  const [provider, setProvider] = useState<'gnani' | 'browser' | null>(null);

  useEffect(() => {
    void voiceService.provider().then(setProvider);
  }, []);

  const listen = () => void toggleListen();

  return (
    <div className="flex flex-col items-center gap-4 pb-6 text-center">
      <div className="w-full text-left">
        <span className="eyebrow">{t('pages.voice')}</span>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight">
          Talk to <span className="text-highlight">HelpMe</span>
        </h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          हिंदी, English or Hinglish. Tap the mic, speak, and HelpMe acts on the map.
        </p>
      </div>
      <EmergencyBanner />
      <motion.button
        type="button"
        aria-label={t('voice.idle')}
        onClick={listen}
        whileTap={{ scale: 0.96 }}
        className={`relative mt-2 flex h-40 w-40 items-center justify-center rounded-full bg-primary text-accent shadow-[var(--shadow-voice)] ring-8 ${voiceState === 'listening' ? 'ring-accent/60' : 'ring-accent/20'}`}
      >
        {voiceState === 'listening' && (
          <motion.span
            className="absolute inset-0 rounded-full bg-accent/40"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <Icon name="mic" size={48} strokeWidth={1.75} />
      </motion.button>
      <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-primary">
        {voiceState === 'listening'
          ? t('voice.listening')
          : voiceState === 'understanding'
            ? t('voice.understanding')
            : voiceState === 'speaking'
              ? t('voice.speaking')
              : t('home.talkSub')}
      </p>
      {provider && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-on-accent">
          {provider === 'gnani'
            ? 'Voice by Gnani AI · Prisma (speech-to-text) + Timbre (text-to-speech)'
            : 'Browser voice (dev fallback) · set GNANI_API_KEY on the server'}
        </p>
      )}
      {(transcript || reply) && (
        <div className="w-full space-y-2 rounded-[var(--radius-xl)] border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)]">
          {transcript && (
            <p className="text-[13.5px] text-text-secondary">
              <span className="font-semibold text-text">You:</span> {transcript}
            </p>
          )}
          {reply && (
            <p className="text-sm">
              <span className="font-semibold text-primary">HelpMe:</span> {reply}
            </p>
          )}
        </div>
      )}
      <div className="flex w-full flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => void runTranscript(s.text)}
            className="rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent"
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex w-full gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t('voice.placeholder')}
          className="h-12 flex-1 rounded-full border border-border bg-surface px-5 text-[14px] outline-none focus:border-primary"
        />
        <Button
          className="h-12 rounded-full px-6"
          onClick={() => {
            if (!typed.trim()) return;
            void runTranscript(typed.trim());
            setTyped('');
          }}
        >
          {t('common.continue')}
        </Button>
      </div>
    </div>
  );
}
