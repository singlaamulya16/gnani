import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmergencyBanner, EmptyState, PlaceCard, PlaceCardSkeleton, SearchField } from '@/components/ui';
import { useAppStore } from '@/store/appStore';

export function MapPage() {
  const { t } = useTranslation();
  const places = useAppStore((s) => s.places);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = places.filter((p) => p.kind !== 'donor');
    const filtered = term
      ? list.filter((p) => p.name.toLowerCase().includes(term) || p.address?.toLowerCase().includes(term) || p.kind.includes(term))
      : list;
    return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 24);
  }, [places, q]);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.fullMap')}</h1>
      <EmergencyBanner />
      <SearchField value={q} onChange={setQ} placeholder="Search hospitals, pharmacies, blood banks…" />
      <p className="text-[12.5px] text-text-secondary">
        {places.length ? `${shown.length} places near you · tap one to see the route` : t('map.pageHint')}
      </p>
      {!places.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlaceCardSkeleton />
          <PlaceCardSkeleton />
        </div>
      ) : shown.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={selectedPlaceId === place.id}
              onSelect={() => setSelectedPlaceId(place.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
