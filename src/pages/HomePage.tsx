import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataStatusBanner, Icon, SmartImage, type IconName } from '@/components/ui';
import { IMAGES } from '@/lib/images';
import { MapPanel } from '@/components/map/MapPanel';
import { Walkthrough } from '@/components/tour/Walkthrough';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { placesService } from '@/services/placesService';
import { useAppStore, type ServiceFilter } from '@/store/appStore';

const services: {
  filter: ServiceFilter;
  route: string;
  titleKey: string;
  subKey: string;
  icon: IconName;
  urgent?: boolean;
}[] = [
  { filter: 'hospital', route: '/hospitals', titleKey: 'services.hospitals', subKey: 'services.hospitalsSub', icon: 'hospital' },
  { filter: 'blood_bank', route: '/blood', titleKey: 'services.blood', subKey: 'services.bloodSub', icon: 'droplet', urgent: true },
  { filter: 'ambulance', route: '/ambulance', titleKey: 'services.ambulance', subKey: 'services.ambulanceSub', icon: 'ambulance', urgent: true },
  { filter: 'clinic', route: '/doctors', titleKey: 'services.doctors', subKey: 'services.doctorsSub', icon: 'stethoscope' },
  { filter: 'pharmacy', route: '/pharmacy', titleKey: 'services.pharmacy', subKey: 'services.pharmacySub', icon: 'pill' },
  { filter: 'ai', route: '/voice', titleKey: 'services.ai', subKey: 'services.aiSub', icon: 'mic' },
];

const SERVICE_IMG: Record<string, string> = {
  hospital: IMAGES.hospital,
  blood_bank: IMAGES.blood,
  ambulance: IMAGES.ambulance,
  clinic: IMAGES.doctorMale,
  pharmacy: IMAGES.pharmacy,
  ai: IMAGES.heroDoctor,
};

const ribbon = ['Hospitals', 'Blood', 'Ambulance', 'Doctors', 'Pharmacy', 'AI Voice', 'हिंदी', 'Hinglish'];

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const setActiveFilters = useAppStore((s) => s.setActiveFilters);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const places = useAppStore((s) => s.places);

  useEffect(() => {
    void placesService.searchWithMeta({ near: coords, kind: 'all' }).then(({ places, meta }) => {
      setPlaces(places, meta);
    });
  }, [coords, setPlaces]);

  const counts = {
    hospital: places.filter((p) => p.kind === 'hospital').length,
    pharmacy: places.filter((p) => p.kind === 'pharmacy').length,
    clinic: places.filter((p) => p.kind === 'clinic' || p.kind === 'doctor').length,
  };

  return (
    <div className="flex flex-col pb-10">
      <Walkthrough />
      {/* ---------- HERO (full screen) ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent-soft blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-[360px] w-[360px] rounded-full bg-primary-soft blur-3xl" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem-56px)] w-full max-w-6xl grid-cols-1 items-center gap-8 px-5 py-8 lg:grid-cols-[1.1fr_1fr] lg:px-10">
        <div className="order-1 flex flex-col gap-4">
          <span className="relative self-start border border-text px-3 py-1 text-[13px] font-medium text-text">
            {t('home.hello', 'Namaste!')}
            {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((pos) => (
              <span key={pos} className={`absolute h-2 w-2 border border-text bg-surface ${pos}`} />
            ))}
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.08] tracking-tight text-text sm:text-[44px] lg:text-[58px]">
            {t('home.heroA', 'Emergency help,')}{' '}
            <span className="text-highlight underline decoration-accent/60 decoration-2 underline-offset-4">
              {t('home.heroB', 'one sentence')}
            </span>{' '}
            {t('home.heroC', 'away.')}
          </h1>
          <p className="max-w-lg text-[15px] leading-relaxed text-text-secondary lg:text-[17px]">
            {t(
              'home.heroBody',
              'Speak in Hindi, English or Hinglish. HelpMe finds hospitals, blood, doctors and ambulances near you, in seconds.',
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              data-tour="sos"
              onClick={() => navigate('/agent')}
              className="group relative inline-flex h-14 items-center gap-3 rounded-full bg-sos pl-2 pr-6 text-[16px] font-bold text-white shadow-[var(--shadow-sos)] transition-transform active:scale-95"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-sos">
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />}
                <Icon name="siren" size={20} strokeWidth={2.25} />
              </span>
              SOS · {t('home.agentCta', 'Talk to Agent')}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilters(['hospital']);
                navigate('/hospitals');
              }}
              className="inline-flex h-14 items-center rounded-full border-[1.5px] border-primary px-6 text-[15px] font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              {t('home.findHospitals', 'Nearest hospital')}
            </button>
          </div>
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            {t('home.poweredBy', 'Voice powered by Gnani AI · Prisma + Timbre')}
          </span>
        </div>

        {/* Image with amber blob */}
        <div className="relative order-2 mx-auto h-[280px] w-[300px] sm:h-[380px] sm:w-[400px] lg:h-[500px] lg:w-full">
          <div className="absolute bottom-0 left-1/2 h-[78%] w-[88%] -translate-x-1/2 rounded-[46%_54%_40%_60%/55%_45%_55%_45%] bg-accent" />
          <div className="absolute bottom-0 left-1/2 h-full w-[88%] -translate-x-1/2 overflow-hidden rounded-b-[46%]">
            <SmartImage
              src={IMAGES.heroDoctor}
              alt="Doctor ready to help"
              className="h-full w-full object-cover object-top"
              fallback={
                <div className="flex h-full w-full items-end justify-center pb-8">
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-accent shadow-[var(--shadow-voice)]">
                    <Icon name="stethoscope" size={56} strokeWidth={1.5} />
                  </span>
                </div>
              }
            />
          </div>
          {/* rotating badge */}
          <div className="absolute right-1 top-3 flex h-[74px] w-[74px] items-center justify-center rounded-full bg-primary shadow-[var(--shadow-float)] sm:right-2">
            <svg viewBox="0 0 100 100" className={reduce ? 'absolute inset-0' : 'absolute inset-0 animate-spin-slow'}>
              <defs>
                <path id="circ" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
              </defs>
              <text fill="#fff" fontSize="11.5" fontWeight="600" letterSpacing="2.2">
                <textPath href="#circ">GNANI AI · VOICE · 24×7 ·</textPath>
              </text>
            </svg>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary-dark">
              <Icon name="mic" size={16} strokeWidth={2.25} />
            </span>
          </div>
          <span className="absolute bottom-10 left-0 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-white shadow-[var(--shadow-float)]">
            हिंदी · English · Hinglish
          </span>
          <span className="absolute bottom-24 right-0 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent shadow-[var(--shadow-accent)]">
            SOS in 1 tap
          </span>
        </div>
      </div>
      </section>

      {/* ---------- RIBBON ---------- */}
      <div className="relative">
        <div className="absolute inset-x-0 top-1 h-12 -rotate-[1.5deg] bg-primary" />
        <div className="relative overflow-hidden bg-accent py-3 shadow-[var(--shadow-accent)]">
          <div className={reduce ? 'flex w-max gap-6' : 'flex w-max animate-marquee gap-6'}>
            {[...ribbon, ...ribbon].map((item, i) => (
              <span key={i} className="flex items-center gap-6 font-[family-name:var(--font-display)] text-[19px] font-semibold text-on-accent lg:text-[22px]">
                {item}
                <span className="text-xl text-primary">✳</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- LIVE MAP (full width) ---------- */}
      <section className="mt-10 w-full px-5 lg:px-10">
        <div className="mx-auto mb-5 flex max-w-6xl flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">{t('nav.map')}</span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight lg:text-[36px]">
              <span className="text-highlight">{t('home.helpWord', 'Help')}</span> {t('home.helpRest', 'near you')}
            </h2>
          </div>
          <DataStatusBanner
            offline={placesMeta?.offline}
            refreshing={placesMeta?.refreshing && !placesMeta?.offline}
            widened={placesMeta?.widened}
            message={placesMeta?.message}
          />
        </div>
        <div data-tour="map" className="lg:h-[min(540px,calc(100dvh-13rem))]">
          <MapPanel className="h-full" variant="sidebar" />
        </div>
        <div className="mx-auto mt-4 grid max-w-6xl grid-cols-3 gap-3">
          {[
            { n: counts.hospital, label: t('services.hospitals') },
            { n: counts.clinic, label: t('services.doctors') },
            { n: counts.pharmacy, label: t('services.pharmacy') },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
              <span className="block font-[family-name:var(--font-display)] text-[26px] font-semibold text-accent">{c.n}+</span>
              <span className="text-[13px] text-text-secondary">{c.label} nearby</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-14 flex w-full max-w-6xl flex-col gap-10 px-5 lg:px-10">
      {/* ---------- SOS ---------- */}
      <button
        type="button"
        onClick={() => navigate('/sos')}
        className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-sos/20 bg-sos-soft/60 p-4 text-left transition-transform active:scale-[0.99]"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sos text-white shadow-[var(--shadow-sos)]">
          {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-sos/40" />}
          <Icon name="siren" size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-display)] text-[17px] font-semibold text-sos">
            {t('home.sosTitle')}
          </span>
          <span className="block text-[13px] leading-snug text-text-secondary">{t('home.sosBody')}</span>
        </span>
        <Icon name="chevronRight" size={22} className="text-sos" />
      </button>

      {/* ---------- SERVICES ---------- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">{t('home.services')}</span>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight lg:text-[36px]">
              <span className="text-highlight">{t('home.servicesWord', 'Services')}</span>{' '}
              {t('home.servicesRest', 'we provide')}
            </h2>
          </div>
          <Link
            to="/map"
            className="group hidden items-center gap-2 rounded-full bg-primary py-1 pl-4 pr-1 text-[13px] font-semibold text-white sm:inline-flex"
          >
            {t('nav.map')}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary">
              <Icon name="chevronRight" size={16} />
            </span>
          </Link>
        </div>

        <motion.div
          data-tour="services"
          className="grid grid-cols-2 gap-4 lg:grid-cols-3"
          variants={reduce ? undefined : staggerContainer}
          initial="initial"
          animate="animate"
        >
          {services.map((s, i) => {
            const count =
              s.filter === 'hospital' ? counts.hospital : s.filter === 'pharmacy' ? counts.pharmacy : s.filter === 'clinic' ? counts.clinic : null;
            return (
              <motion.button
                key={s.filter}
                type="button"
                variants={reduce ? undefined : staggerItem}
                custom={i}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (s.filter !== 'ai') setActiveFilters([s.filter]);
                  navigate(s.route);
                }}
                className={`group relative flex min-h-[150px] items-stretch gap-4 overflow-hidden rounded-[var(--radius-xl)] border-2 p-3 text-left shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-float)] ${
                  s.urgent
                    ? 'border-sos/30 bg-gradient-to-br from-sos-soft to-white hover:border-sos'
                    : s.filter === 'ai'
                      ? 'border-primary bg-primary text-white'
                      : 'border-accent/50 bg-gradient-to-br from-accent-soft to-white hover:border-accent'
                }`}
              >
                {/* photo on the left */}
                <span className="relative w-[42%] shrink-0 overflow-hidden rounded-[14px] bg-surface-mid">
                  <SmartImage
                    src={SERVICE_IMG[s.filter] ?? IMAGES.hospital}
                    alt={t(s.titleKey)}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    fallback={
                      <span className="absolute inset-0 flex items-center justify-center text-primary">
                        <Icon name={s.icon} size={34} />
                      </span>
                    }
                  />
                  <span className={`absolute inset-x-0 top-0 h-1.5 ${s.urgent ? 'bg-sos' : 'bg-accent'}`} />
                  <span
                    className={
                      s.urgent
                        ? 'absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-full bg-sos text-white shadow-[var(--shadow-sos)]'
                        : s.filter === 'ai'
                          ? 'absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark'
                          : 'absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-accent'
                    }
                  >
                    <Icon name={s.icon} size={19} strokeWidth={2} />
                  </span>
                </span>
                {/* text on the right */}
                <span className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                  <span className={`block font-[family-name:var(--font-display)] text-[18px] font-semibold leading-tight ${s.filter === 'ai' ? 'text-white' : 'text-text'}`}>
                    {t(s.titleKey)}
                  </span>
                  <span className={`mt-1.5 block text-[13px] leading-snug ${s.filter === 'ai' ? 'text-white/75' : 'text-text-secondary'}`}>{t(s.subKey)}</span>
                  <span className={`mt-auto flex items-center justify-between pt-3 text-[13px] font-semibold ${s.filter === 'ai' ? 'text-accent' : s.urgent ? 'text-sos' : 'text-primary'}`}>
                    <span className="inline-flex items-center gap-1 group-hover:text-accent-dark">
                      {t('common.open', 'Open')} <span className="text-accent">→</span>
                    </span>
                    {count ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">{count} near</span>
                    ) : null}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      {/* ---------- EMERGENCY LINES ---------- */}
      <section className="overflow-hidden rounded-[var(--radius-2xl)] bg-primary p-5 text-white">
        <span className="text-[13px] font-semibold text-accent">— {t('home.emergencyLines')}</span>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { n: '112', label: 'National' },
            { n: '102', label: 'Ambulance' },
            { n: '108', label: 'Emergency' },
          ].map((line) => (
            <a
              key={line.n}
              href={`tel:${line.n}`}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-lg)] bg-white/10 py-3 transition-colors hover:bg-white/15"
            >
              <span className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-none text-accent">
                {line.n}
              </span>
              <span className="text-[12px] text-white/80">{line.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- DONOR CTA ---------- */}
      <Link
        to="/donor/register"
        className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] bg-accent p-4 shadow-[var(--shadow-accent)] transition-transform active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-accent">
            <Icon name="droplet" size={22} />
          </span>
          <span>
            <span className="block font-[family-name:var(--font-display)] text-[19px] font-semibold text-on-accent lg:text-[22px]">
              {t('home.donorCta')}
            </span>
            <span className="text-[13px] text-on-accent/80">{t('home.donorSub')}</span>
          </span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary">
          <Icon name="chevronRight" size={18} />
        </span>
      </Link>
      </div>
    </div>
  );
}
