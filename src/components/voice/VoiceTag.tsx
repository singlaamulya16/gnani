import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { useAppStore } from '@/store/appStore';

/**
 * Side tag fixed to the right edge, vertically centred.
 * Tap = talk (Gnani Prisma → intent → action → Gnani Timbre). Shows a small status bubble while active.
 */
export function VoiceTag() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { voiceState, toggleListen } = useVoiceCommand();
  const transcript = useAppStore((s) => s.voiceTranscript);
  const reply = useAppStore((s) => s.voiceReply);
  const [showBubble, setShowBubble] = useState(false);

  const active = voiceState !== 'idle';
  useEffect(() => {
    if (active) {
      setShowBubble(true);
      return;
    }
    const id = window.setTimeout(() => setShowBubble(false), 4000);
    return () => window.clearTimeout(id);
  }, [active]);

  const status =
    voiceState === 'listening'
      ? t('voice.listening')
      : voiceState === 'understanding'
        ? t('voice.understanding')
        : voiceState === 'speaking'
          ? t('voice.speaking')
          : voiceState === 'error'
            ? t('voice.error')
            : t('home.talkTitle');

  return (
    <div className="pointer-events-none fixed right-0 top-1/2 z-[60] flex -translate-y-1/2 items-center gap-3">
      <AnimatePresence>
        {showBubble && (transcript || reply || active) && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="pointer-events-auto w-64 rounded-2xl border border-border bg-surface p-3 text-left shadow-[var(--shadow-float)]"
          >
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {status}
            </p>
            {transcript && (
              <p className="mt-1.5 text-[12.5px] text-text-secondary">
                <span className="font-semibold text-text">You:</span> {transcript}
              </p>
            )}
            {reply && (
              <p className="mt-1 text-[13px] text-text">
                <span className="font-semibold text-primary">HelpMe:</span> {reply}
              </p>
            )}
            <p className="mt-2 text-[11px] text-text-secondary">Gnani AI · Prisma + Timbre</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={status}
        onClick={() => void toggleListen()}
        whileHover={reduce ? undefined : { x: -4 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'pointer-events-auto flex flex-col items-center gap-3 rounded-l-[22px] bg-primary px-2.5 py-4 text-white shadow-[var(--shadow-voice)]',
          voiceState === 'listening' && 'ring-4 ring-accent/60',
        )}
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark">
          {!reduce && (voiceState === 'idle' || voiceState === 'listening') && (
            <motion.span
              className="absolute inset-0 rounded-full bg-accent/60"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: voiceState === 'listening' ? 1 : 2.2, repeat: Infinity }}
            />
          )}
          <Icon name="mic" size={18} strokeWidth={2.25} />
        </span>
        <span
          className="font-[family-name:var(--font-display)] text-[14px] font-semibold tracking-wide"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {voiceState === 'idle' ? t('home.talkTitle') : status}
        </span>
        {(voiceState === 'listening' || voiceState === 'speaking') && (
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            {[0.5, 1, 0.7].map((h, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-accent"
                animate={reduce ? { height: 6 } : { height: [4, 14 * h, 6, 12 * h, 4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </span>
        )}
      </motion.button>
    </div>
  );
}
