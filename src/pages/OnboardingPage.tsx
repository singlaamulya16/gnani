import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/store/appStore';

const LANGUAGES = [
  { code: 'hi', native: 'हिन्दी', en: 'Hindi' },
  { code: 'en', native: 'English', en: 'English' },
  { code: 'ta', native: 'தமிழ்', en: 'Tamil' },
  { code: 'te', native: 'తెలుగు', en: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada' },
  { code: 'bn', native: 'বাংলা', en: 'Bengali' },
  { code: 'mr', native: 'मराठी', en: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', en: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi' },
  { code: 'ml', native: 'മലയാളം', en: 'Malayalam' },
] as const;

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setGpsActive = useAppStore((s) => s.setGpsActive);
  const language = useAppStore((s) => s.language);
  const [selected, setSelected] = useState(language || 'hi');
  const [step, setStep] = useState<'lang' | 'location'>('lang');

  const finish = () => {
    setLanguage(selected === 'en' || selected === 'hi' ? selected : 'en');
    setOnboarded(true);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full bg-bg">
      <div className="flex w-full flex-col justify-between bg-surface p-6 shadow-sm lg:w-[42%] lg:p-10">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-primary text-on-primary">
                  <Icon name="heartPulse" size={22} />
                </span>
                <span className="font-[family-name:var(--font-sans)] text-base font-bold">
                  {t('brand.name')}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sos-soft px-3 py-1 text-xs font-semibold text-sos">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sos" />
                {t('onboarding.badge')}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('brand.tagline')}
            </p>
            <p className="text-[13px] font-semibold">{t('brand.subtitle')}</p>
          </div>

          {step === 'lang' ? (
            <>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight tracking-tight lg:text-[32px]">
                  {t('onboarding.title')}
                </h1>
                <p className="mt-1 text-text-secondary">{t('onboarding.hint')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('onboarding.title')}>
                {LANGUAGES.map((lang) => {
                  const active = selected === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelected(lang.code);
                        if (lang.code === 'en' || lang.code === 'hi') setLanguage(lang.code);
                      }}
                      className={cn(
                        'relative flex min-h-10 flex-col items-start justify-center rounded-[var(--radius-lg)] p-3.5 text-left shadow-[var(--shadow-card)] transition-colors',
                        active
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'bg-surface-low hover:bg-surface-mid',
                      )}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span
                          className={cn(
                            'font-[family-name:var(--font-sans)] text-base font-semibold',
                            active && 'text-primary',
                          )}
                        >
                          {lang.native}
                        </span>
                        {active && <Icon name="checkCircle" size={20} className="text-primary" />}
                      </span>
                      <span className="text-xs text-text-secondary">{lang.en}</span>
                    </motion.button>
                  );
                })}
              </div>
              <Button fullWidth onClick={() => setStep('location')}>
                {t('common.continue')}
              </Button>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight tracking-tight">
                  {t('onboarding.locationTitle')}
                </h1>
                <p className="mt-2 text-text-secondary">{t('onboarding.locationBody')}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border bg-surface-low p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon name="shieldCheck" size={24} />
                  </span>
                  <div>
                    <p className="font-semibold">Rohini, Sector 14, Delhi</p>
                    <p className="text-[12px] text-text-secondary">Ward 54 · North-West</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  fullWidth
                  icon="locateFixed"
                  onClick={() => {
                    setGpsActive(true);
                    finish();
                  }}
                >
                  {t('onboarding.enableGps')}
                </Button>
                <Button fullWidth variant="ghost" onClick={finish}>
                  {t('onboarding.continue')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,#c5ebe4,transparent_50%),linear-gradient(145deg,#0e9f8e,#00685c)]" />
        <div className="absolute inset-0 flex items-end p-12">
          <div className="max-w-md text-white">
            <Icon name="heartPulse" size={40} className="mb-4 opacity-90" />
            <p className="font-[family-name:var(--font-sans)] text-3xl font-bold leading-tight">
              Calm, clear help when every second matters.
            </p>
            <p className="mt-3 text-white/80">
              One responsive experience for every phone and clinic desk across India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
