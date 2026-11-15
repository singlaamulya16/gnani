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
    <div className="flex flex-col items-center gap-3 pb-3 text-center">
      <h1 className="w-full text-left font-[family-name:var(--font-sans)] text-sm font-bold">
        {t('pages.voice')}
      </h1>
      <EmergencyBanner />
      <motion.button
        type="button"
        aria-label={t('voice.idle')}
        onClick={listen}
        whileTap={{ scale: 0.96 }}
        className="relative flex h-36 w-36 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--shadow-voice)]"
      >
        {voiceState === 'listening' && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <Icon name="mic" size={48} strokeWidth={1.75} />
      </motion.button>
      <p className="text-[12px] font-semibold text-primary">
        {voiceState === 'listening'
          ? t('voice.listening')
          : voiceState === 'understanding'
            ? t('voice.understanding')
            : voiceState === 'speaking'
              ? t('voice.speaking')
              : t('home.talkSub')}
      </p>
      {provider && (
        <p className="text-[11px] text-text-secondary">
          {provider === 'gnani'
            ? 'Voice by Gnani AI · Prisma (speech-to-text) + Timbre (text-to-speech)'
            : 'Browser voice (dev fallback) · set GNANI_API_KEY on the server'}
        </p>
      )}
      {(transcript || reply) && (
        <div className="w-full space-y-2 rounded-[var(--radius-lg)] bg-surface p-3 text-left shadow-[var(--shadow-card)]">
          {transcript && (
            <p className="text-[12px] text-text-secondary">
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
            className="rounded-full bg-surface-low px-3 py-2 text-[12px] font-semibold text-text"
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
          className="h-10 flex-1 rounded-[var(--radius-lg)] bg-surface-low px-3 text-[13px] outline-none"
        />
        <Button
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
