import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataStatusBanner,
  EmergencyBanner,
  EmptyState,
  PlaceCard,
  PlaceCardSkeleton,
  useToastStore,
} from '@/components/ui';
import { ambulanceService } from '@/services/ambulanceService';
import { placesService } from '@/services/placesService';
import { useAppStore } from '@/store/appStore';
import { PageVoice } from '@/components/voice/PageVoice';

export function AmbulancePage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const setRoute = useAppStore((s) => s.setRoute);
  const push = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setLoading(true);
    void placesService.searchWithMeta({ near: coords, kind: 'ambulance' }).then(({ places: list, meta }) => {
      setPlaces(list, meta);
      setLoading(false);
    });
  }, [coords, setPlaces]);

  const requestNearest = async () => {
    setRequesting(true);
    const { ambulance, route, demo } = await ambulanceService.requestNearest(coords);
    setSelectedPlaceId(ambulance.id);
    setRoute(route);
    push(demo ? t('ambulance.dispatchedDemo') : t('ambulance.dispatched'), 'success');
    setRequesting(false);
  };

  const list = places.filter((p) => p.kind === 'ambulance');

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.ambulance')}</h1>
      <PageVoice page="ambulance" />
      <EmergencyBanner />
      <DataStatusBanner
        offline={placesMeta?.offline}
        refreshing={placesMeta?.refreshing && list.length === 0}
        widened={placesMeta?.widened}
        message={placesMeta?.message}
      />
      <div className="grid grid-cols-2 gap-2">
        <a
          href="tel:102"
          className="flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary text-on-primary font-bold"
        >
          102
        </a>
        <a
          href="tel:108"
          className="flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-primary-dark text-on-primary font-bold"
        >
          108
        </a>
      </div>
      <Button fullWidth icon="ambulance" disabled={requesting} onClick={() => void requestNearest()}>
        {t('ambulance.requestNearest')}
      </Button>
      {loading || (placesMeta?.refreshing && list.length === 0) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={selectedPlaceId === place.id}
              onSelect={() => setSelectedPlaceId(place.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
