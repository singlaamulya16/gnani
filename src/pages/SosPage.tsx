import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmergencyBanner, FilterChip, PlaceCard, StatusTimeline } from '@/components/ui';
import { placesService } from '@/services/placesService';
import { routingService } from '@/services/routingService';
import { useAppStore } from '@/store/appStore';

const emergencyTypes = ['Accident', 'Heart', 'Breathing', 'Bleeding', 'Other'] as const;

export function SosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const setRoute = useAppStore((s) => s.setRoute);
  const places = useAppStore((s) => s.places);
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<'countdown' | 'arranging'>('countdown');
  const [etype, setEtype] = useState<(typeof emergencyTypes)[number]>('Accident');

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count <= 0) {
      setPhase('arranging');
      void placesService.searchWithMeta({ near: coords, kind: 'hospital' }).then(async ({ places: list, meta }) => {
        setPlaces(list, meta);
        const nearest = list[0];
        if (nearest) {
          setSelectedPlaceId(nearest.id);
          const route = await routingService.getRoute(coords, {
            lat: nearest.lat,
            lng: nearest.lng,
          });
          setRoute(route);
        }
      });
      return;
    }
    const id = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [count, phase, coords, setPlaces, setRoute, setSelectedPlaceId]);

  const nearest = places.find((p) => p.kind === 'hospital');

  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight text-sos">
        {t('sos.title')}
      </h1>
      <EmergencyBanner />

      {phase === 'countdown' ? (
        <>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {emergencyTypes.map((type) => (
              <FilterChip
                key={type}
                label={type}
                active={etype === type}
                onClick={() => setEtype(type)}
              />
            ))}
          </div>
          <p className="text-text-secondary">{t('sos.countdown')}</p>
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-sos-soft)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="var(--color-sos)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={276}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: ((5 - count) / 5) * 276 }}
                transition={{ duration: 0.35 }}
              />
            </svg>
            <span className="font-[family-name:var(--font-sans)] text-5xl font-bold tabular-nums text-sos">
              {count}
            </span>
          </div>
          <Button variant="outline" fullWidth onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
        </>
      ) : (
        <div className="w-full space-y-3 text-left">
          <p className="text-center font-semibold text-primary">{t('sos.arranging')}</p>
          <div className="rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)]">
            <StatusTimeline
              steps={[
                { id: '1', label: t('sos.steps.location'), done: true },
                { id: '2', label: t('sos.steps.ambulance'), done: true },
                { id: '3', label: t('sos.steps.hospital'), active: true },
                { id: '4', label: t('sos.steps.contacts'), done: false },
              ]}
            />
          </div>
          {nearest && (
            <PlaceCard
              place={nearest}
              selected
              onSelect={() => setSelectedPlaceId(nearest.id)}
            />
          )}
          <Button fullWidth onClick={() => navigate('/')}>
            {t('nav.home')}
          </Button>
        </div>
      )}
    </div>
  );
}
