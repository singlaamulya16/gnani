import { useTranslation } from 'react-i18next';
import { EmptyState, PlaceCard, PlaceCardSkeleton } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import type { PlaceKind } from '@/services/placesService';
import { useEffect, useState } from 'react';
import { placesService } from '@/services/placesService';

interface PlaceholderPageProps {
  titleKey: string;
  kind?: PlaceKind | PlaceKind[];
}

export function PlaceholderPage({ titleKey, kind }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [loading, setLoading] = useState(Boolean(kind));

  useEffect(() => {
    if (!kind) return;
    const near = coords ?? { lat: 28.7041, lng: 77.1025 };
    setLoading(true);
    void placesService.searchWithMeta({ near, kind }).then(({ places: list, meta }) => {
      setPlaces(list, meta);
      setLoading(false);
    });
  }, [kind, coords, setPlaces]);

  const filtered = kind
    ? places.filter((p) => (Array.isArray(kind) ? kind.includes(p.kind) : p.kind === kind))
    : [];

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight tracking-tight">
        {t(titleKey)}
      </h1>
      {kind ? (
        loading ? (
          <div className="space-y-3">
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
            <PlaceCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filtered.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                selected={selectedPlaceId === place.id}
                onSelect={() => setSelectedPlaceId(place.id)}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState description={t('common.comingSoon')} />
      )}
    </div>
  );
}
