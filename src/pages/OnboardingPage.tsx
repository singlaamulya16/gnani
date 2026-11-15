import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, SmartImage } from '@/components/ui';
import { cn } from '@/lib/cn';
import { IMAGES } from '@/lib/images';
import { useAppStore } from '@/store/appStore';

const LANGUAGES = [
  { code: 'hi', native: 'हिन्दी', en: 'Hindi' },
  { code: 'en', native: 'English', en: 'English' },
  { code: 'hi-en', native: 'Hinglish', en: 'Hindi + English' },
  { code: 'ta', native: 'தமிழ்', en: 'Tamil' },
  { code: 'te', native: 'తెలుగు', en: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada' },
  { code: 'bn', native: 'বাংলা', en: 'Bengali' },
  { code: 'mr', native: 'मराठी', en: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', en: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi' },
  { code: 'ml', native: 'മലയാളം', en: 'Malayalam' },
] as const;

const PROMISES = [
  { icon: 'shieldCheck' as const, title: 'Private by default', body: 'Shared only with the ambulance or hospital you choose.' },
  { icon: 'navigation' as const, title: 'Fastest route', body: 'Nearest help sorted by real distance, with directions.' },
  { icon: 'mic' as const, title: 'Voice in your language', body: 'Powered by Gnani AI — Prisma + Timbre.' },
];

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setGpsActive = useAppStore((s) => s.setGpsActive);
  const language = useAppStore((s) => s.language);
  const locationLabel = useAppStore((s) => s.locationLabel);
  const [selected, setSelected] = useState<string>(language || 'hi');
  const [step, setStep] = useState<1 | 2>(1);

  const finish = () => {
    setLanguage(selected === 'en' ? 'en' : 'hi');
    setOnboarded(true);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-full bg-bg">
      {/* ---------- Left: steps ---------- */}
      <div className="flex w-full flex-col px-6 py-6 lg:w-[52%] lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark">
              <Icon name="heartPulse" size={20} strokeWidth={2.25} />
            </span>
            <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold">
              HelpMe<span className="text-accent">.</span>
            </span>
          </span>
          <a href="tel:112" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-sos px-4 text-[13px] font-bold text-white shadow-[var(--shadow-sos)]">
            <Icon name="phone" size={15} /> 112
          </a>
        </div>

        {/* progress */}
        <div className="mt-8 flex items-center gap-3">
          {[1, 2].map((n) => (
            <span key={n} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors',
                  step >= n ? 'bg-primary text-accent' : 'bg-surface-mid text-text-secondary',
                )}
              >
                {step > n ? <Icon name="check" size={15} strokeWidth={3} /> : n}
              </span>
              <span className={cn('text-[13px] font-semibold', step >= n ? 'text-text' : 'text-text-secondary')}>
                {n === 1 ? 'Language' : 'Location'}
              </span>
              {n === 1 && <span className={cn('mx-1 h-0.5 w-10 rounded-full', step > 1 ? 'bg-accent' : 'bg-surface-mid')} />}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="lang"
              initial={{ opacity: 0, x: reduce ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -24 }}
              transition={{ duration: 0.25 }}
              className="mt-8 flex flex-1 flex-col"
            >
              <span className="eyebrow">Step 1 of 2</span>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.1] tracking-tight lg:text-[44px]">
                Speak to us in <span className="text-highlight">your language</span>
              </h1>
              <p className="mt-3 max-w-lg text-[15px] text-text-secondary">
                Choose how HelpMe talks to you. You can switch any time — or just say “Hindi mein bolo”.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('onboarding.title')}>
                {LANGUAGES.map((lang) => {
                  const active = selected === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelected(lang.code);
                        if (lang.code === 'en' || lang.code === 'hi') setLanguage(lang.code);
                      }}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 px-4 py-3.5 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary text-white shadow-[var(--shadow-voice)]'
                          : 'border-accent/30 bg-gradient-to-br from-accent-soft to-white hover:border-accent',
                      )}
                    >
                      <span className="font-[family-name:var(--font-display)] text-[19px] font-semibold leading-tight">{lang.native}</span>
                      <span className={cn('text-[12.5px]', active ? 'text-accent' : 'text-text-secondary')}>{lang.en}</span>
                      {active && (
                        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-primary-dark">
                          <Icon name="check" size={14} strokeWidth={3} />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px] text-text-secondary">
                Voice works in all of these through Gnani AI. Screen text is available in English and Hindi.
              </p>

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="group inline-flex h-14 w-full items-center justify-between rounded-full bg-primary pl-7 pr-2 text-[16px] font-semibold text-white shadow-[var(--shadow-voice)] sm:w-auto sm:gap-10"
                >
                  {t('common.continue')}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark transition-transform group-hover:translate-x-1">
                    <Icon name="chevronRight" size={20} strokeWidth={2.5} />
                  </span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loc"
              initial={{ opacity: 0, x: reduce ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -24 }}
              transition={{ duration: 0.25 }}
              className="mt-8 flex flex-1 flex-col"
            >
              <span className="eyebrow">Step 2 of 2</span>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.1] tracking-tight lg:text-[44px]">
                Find help <span className="text-highlight">near you</span>
              </h1>
              <p className="mt-3 max-w-lg text-[15px] text-text-secondary">
                Allow location so we can show the nearest hospitals, blood banks and ambulances — and send help to the right place.
              </p>

              <div className="mt-6 flex items-center gap-5 rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
                <span className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  {!reduce &&
                    [0, 0.6, 1.2].map((d) => (
                      <motion.span
                        key={d}
                        className="absolute inset-0 rounded-full border-2 border-accent"
                        initial={{ scale: 0.4, opacity: 0.8 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: d }}
                      />
                    ))}
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-accent">
                    <Icon name="locateFixed" size={26} />
                  </span>
                </span>
                <span>
                  <span className="block text-[12px] font-semibold uppercase tracking-wide text-text-secondary">Current area</span>
                  <span className="block font-[family-name:var(--font-display)] text-[19px] font-semibold">{locationLabel}</span>
                  <span className="text-[13px] text-text-secondary">GPS will refine this to your exact spot.</span>
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {PROMISES.map((p) => (
                  <div key={p.title} className="rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent-soft to-white p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-accent">
                      <Icon name={p.icon} size={18} />
                    </span>
                    <span className="mt-2 block font-[family-name:var(--font-display)] text-[15px] font-semibold">{p.title}</span>
                    <span className="text-[12.5px] leading-snug text-text-secondary">{p.body}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setGpsActive(true);
                    finish();
                  }}
                  className="group inline-flex h-14 items-center justify-between gap-6 rounded-full bg-primary pl-7 pr-2 text-[16px] font-semibold text-white shadow-[var(--shadow-voice)]"
                >
                  {t('onboarding.enableGps', 'Allow location')}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark">
                    <Icon name="locateFixed" size={18} strokeWidth={2.25} />
                  </span>
                </button>
                <button type="button" onClick={finish} className="h-14 rounded-full border-[1.5px] border-primary px-6 text-[15px] font-semibold text-primary hover:bg-primary-soft">
                  Skip for now
                </button>
                <button type="button" onClick={() => setStep(1)} className="text-[13px] font-semibold text-text-secondary hover:text-text sm:ml-auto">
                  ← Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- Right: brand visual ---------- */}
      <div className="relative hidden flex-1 overflow-hidden bg-primary lg:block">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="max-w-md">
            <span className="text-[13px] font-semibold text-accent">— HelpMe for India</span>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[36px] font-semibold leading-[1.15] text-white">
              Emergency help, <span className="italic text-accent">one sentence</span> away.
            </p>
          </div>

          <div className="relative mx-auto h-[380px] w-[340px]">
            <div className="absolute bottom-0 left-1/2 h-[80%] w-full -translate-x-1/2 rounded-[46%_54%_40%_60%/55%_45%_55%_45%] bg-accent" />
            <div className="absolute bottom-0 left-1/2 h-full w-full -translate-x-1/2 overflow-hidden rounded-b-[46%]">
              <SmartImage
                src={IMAGES.heroDoctor}
                alt="Doctor ready to help"
                className="h-full w-full object-cover object-top"
                fallback={
                  <div className="flex h-full items-end justify-center pb-10">
                    <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white text-primary">
                      <Icon name="stethoscope" size={56} />
                    </span>
                  </div>
                }
              />
            </div>
            <span className="absolute -left-6 bottom-16 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-primary shadow-[var(--shadow-float)]">
              B+ donor found · 1.3 km
            </span>
            <span className="absolute -right-4 top-16 rounded-full bg-sos px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-sos)]">
              Ambulance · 6 min
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-white">
            {[
              { n: '10+', l: 'Indian languages' },
              { n: '24×7', l: 'SOS & voice' },
              { n: '112', l: 'One tap to call' },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-white/10 px-4 py-3">
                <span className="block font-[family-name:var(--font-display)] text-[22px] font-semibold text-accent">{x.n}</span>
                <span className="text-[12.5px] text-white/75">{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
