import { useTranslation } from 'react-i18next';
import { EmergencyBanner, PlaceCard, PlaceCardSkeleton } from '@/components/ui';
import { useAppStore } from '@/store/appStore';

export function MapPage() {
  const { t } = useTranslation();
  const places = useAppStore((s) => s.places);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.fullMap')}</h1>
      <EmergencyBanner />
      <p className="text-[12px] text-text-secondary">{t('map.pageHint')}</p>
      {!places.length ? (
        <PlaceCardSkeleton />
      ) : (
        <div className="space-y-3">
          {places.slice(0, 8).map((place) => (
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
