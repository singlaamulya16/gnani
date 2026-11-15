import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
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
import { PageVoice } from '@/components/voice/PageVoice';

export function PharmacyPage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [q, setQ] = useState('');
  const [open24, setOpen24] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void placesService.searchWithMeta({ near: coords, kind: 'pharmacy', q }).then(({ places: list, meta }) => {
      setPlaces(list, meta);
      setLoading(false);
    });
  }, [coords, q, setPlaces]);

  const list = useMemo(
    () =>
      places
        .filter((p) => p.kind === 'pharmacy')
        .filter((p) => (open24 ? p.openNow === true : true)),
    [places, open24],
  );

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.pharmacy')}</h1>
      <PageVoice page="pharmacy" />
      <EmergencyBanner />
      <DataStatusBanner
        offline={placesMeta?.offline}
        refreshing={placesMeta?.refreshing && list.length === 0}
        widened={placesMeta?.widened}
        message={placesMeta?.message}
      />
      <SearchField value={q} onChange={setQ} placeholder={t('pharmacy.search')} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <FilterChip label={t('pharmacy.open24')} active={open24} onClick={() => setOpen24((v) => !v)} />
      </div>
      <Link to="/voice">
        <Button variant="outline" fullWidth icon="mic">
          {t('pharmacy.askAi')}
        </Button>
      </Link>
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
