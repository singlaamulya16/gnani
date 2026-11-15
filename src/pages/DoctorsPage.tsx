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

const specialties = ['All', 'general', 'paediatrics', 'gynaecology', 'cardiology', 'orthopaedics', 'ophthalmology'];

export function DoctorsPage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void placesService
      .searchWithMeta({ near: coords, kind: ['doctor', 'clinic'], q })
      .then(({ places: list, meta }) => {
        setPlaces(list, meta);
        setLoading(false);
      });
  }, [coords, q, setPlaces]);

  const list = useMemo(
    () =>
      places
        .filter((p) => p.kind === 'clinic' || p.kind === 'doctor')
        .filter((p) =>
          specialty === 'All'
            ? true
            : (p.tags ?? []).some((tag) => tag.toLowerCase().includes(specialty.toLowerCase())),
        ),
    [places, specialty],
  );

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.doctors')}</h1>
      <EmergencyBanner />
      <DataStatusBanner
        offline={placesMeta?.offline}
        refreshing={placesMeta?.refreshing && list.length === 0}
        widened={placesMeta?.widened}
        message={placesMeta?.message}
      />
      <SearchField value={q} onChange={setQ} placeholder={t('doctors.search')} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {specialties.map((s) => (
          <FilterChip
            key={s}
            label={s === 'All' ? 'All' : s}
            active={specialty === s}
            onClick={() => setSpecialty(s)}
          />
        ))}
      </div>
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
