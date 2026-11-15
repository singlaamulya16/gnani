import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataStatusBanner,
  EmergencyBanner,
  EmptyState,
  FilterChip,
  PlaceCard,
  PlaceCardSkeleton,
  SearchField,
} from '@/components/ui';
import { placesService } from '@/services/placesService';
import { useAppStore } from '@/store/appStore';
import { EMERGENCY_NUMBERS } from '@/types/domain';

export function HospitalsPage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [traumaOnly, setTraumaOnly] = useState(false);
  const [open24, setOpen24] = useState(false);

  useEffect(() => {
    setLoading(true);
    void placesService.searchWithMeta({ near: coords, kind: 'hospital', q }).then(({ places: list, meta }) => {
      setPlaces(list, meta);
      setLoading(false);
    });
  }, [coords, q, setPlaces]);

  const list = useMemo(
    () =>
      places
        .filter((p) => p.kind === 'hospital')
        .filter((p) => (traumaOnly ? (p.tags ?? []).includes('emergency') : true))
        .filter((p) => (open24 ? p.openNow === true : true)),
    [places, traumaOnly, open24],
  );

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight tracking-tight">
        {t('pages.hospitals')}
      </h1>
      <EmergencyBanner />
      <DataStatusBanner
        offline={placesMeta?.offline}
        refreshing={placesMeta?.refreshing && list.length === 0}
        widened={placesMeta?.widened}
        message={placesMeta?.message}
      />
      <SearchField value={q} onChange={setQ} placeholder={t('hospitals.search')} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <FilterChip label={t('hospitals.trauma')} active={traumaOnly} onClick={() => setTraumaOnly((v) => !v)} icon="siren" />
        <FilterChip label={t('hospitals.open24')} active={open24} onClick={() => setOpen24((v) => !v)} />
      </div>
      <p className="text-[11px] text-text-secondary">
        {t('common.call112')} · 112 / {EMERGENCY_NUMBERS.ambulance} / {EMERGENCY_NUMBERS.disaster}
      </p>
      {loading || (placesMeta?.refreshing && list.length === 0) ? (
        <div className="space-y-3">
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </div>
      ) : list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
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
