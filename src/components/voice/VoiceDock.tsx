import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';

interface VoiceDockProps {
  floating?: boolean;
  className?: string;
}

export function VoiceDock({ floating, className }: VoiceDockProps) {
  const { t } = useTranslation();
  const { voiceState, toggleListen } = useVoiceCommand();
  const reduce = useReducedMotion();

  const label =
    voiceState === 'listening'
      ? t('voice.listening')
      : voiceState === 'understanding'
        ? t('voice.understanding')
        : voiceState === 'speaking'
          ? t('voice.speaking')
          : t('voice.idle');

  const run = () => void toggleListen();

  return (
    <div
      className={cn(
        floating
          ? 'absolute bottom-2 left-3 right-3 z-20 lg:left-4 lg:right-4'
          : 'border-t border-border bg-surface p-2.5',
        className,
      )}
    >
      <motion.button
        type="button"
        aria-label={label}
        onClick={() => void run()}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left shadow-[var(--shadow-voice)]',
          floating ? 'glass' : 'bg-primary-soft',
        )}
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
            {!reduce && voiceState === 'idle' && (
              <motion.span
                className="absolute inset-0 rounded-full bg-primary/40"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
            )}
            <Icon name="mic" size={18} />
          </span>
          <span>
            <span className="block font-[family-name:var(--font-sans)] text-sm font-bold text-text">
              {t('home.talkTitle')}
            </span>
            <span className="block text-[11px] text-primary">{label}</span>
          </span>
        </span>

        <AnimatePresence mode="wait">
          {voiceState === 'listening' || voiceState === 'speaking' ? (
            <motion.span
              key="wave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-5 items-end gap-0.5"
              aria-hidden
            >
              {[0.4, 1, 0.7, 0.35, 0.85].map((h, i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  animate={reduce ? { height: 8 } : { height: [6, 18 * h, 8, 16 * h, 6] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.08 }}
                />
              ))}
            </motion.span>
          ) : (
            <Icon name="chevronRight" size={20} className="text-primary" />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
