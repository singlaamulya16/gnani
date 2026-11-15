import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FilterChip, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { placesService } from '@/services/placesService';
import { routingService } from '@/services/routingService';
import type { ServiceFilter } from '@/store/appStore';
import { useAppStore } from '@/store/appStore';
import type { PlaceKind } from '@/types/domain';
import { MapCanvas } from './MapCanvas';

const chips: {
  id: ServiceFilter;
  labelKey: string;
  icon: 'siren' | 'ambulance' | 'hospital' | 'droplet' | 'pill' | 'stethoscope';
}[] = [
  { id: 'all', labelKey: 'services.all', icon: 'siren' },
  { id: 'ambulance', labelKey: 'services.ambulance', icon: 'ambulance' },
  { id: 'hospital', labelKey: 'services.hospitals', icon: 'hospital' },
  { id: 'blood_bank', labelKey: 'services.blood', icon: 'droplet' },
  { id: 'pharmacy', labelKey: 'services.pharmacy', icon: 'pill' },
  { id: 'clinic', labelKey: 'services.doctors', icon: 'stethoscope' },
];

const routeKind: Record<string, PlaceKind | PlaceKind[] | 'all'> = {
  '/': 'all',
  '/map': 'all',
  '/hospitals': 'hospital',
  '/doctors': ['doctor', 'clinic'],
  '/pharmacy': 'pharmacy',
  '/blood': ['blood_bank', 'donor'],
  '/ambulance': 'ambulance',
  '/sos': 'hospital',
  '/voice': 'all',
};

export function MapPanel({ className }: { className?: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const coords = useAppStore((s) => s.coords);
  const places = useAppStore((s) => s.places);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const filters = useAppStore((s) => s.activeFilters);
  const setActiveFilters = useAppStore((s) => s.setActiveFilters);
  const toggleFilter = useAppStore((s) => s.toggleFilter);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const route = useAppStore((s) => s.route);
  const setRoute = useAppStore((s) => s.setRoute);
  const mapPitch = useAppStore((s) => s.mapPitch);
  const setMapPitch = useAppStore((s) => s.setMapPitch);
  const usingSampleLocation = useAppStore((s) => s.usingSampleLocation);
  const placesMeta = useAppStore((s) => s.placesMeta);
  const [recenterKey, setRecenterKey] = useState(0);
  const hasMapboxDirections = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

  // Sync page → map filter (home = all; service pages = that service)
  useEffect(() => {
    const kind = routeKind[location.pathname] ?? 'all';
    if (kind === 'all') {
      if (location.pathname === '/' || location.pathname === '/map' || location.pathname === '/voice') {
        setActiveFilters(['all']);
      }
      return;
    }
    if (Array.isArray(kind)) setActiveFilters(kind);
    else setActiveFilters([kind]);
  }, [location.pathname, setActiveFilters]);

  useEffect(() => {
    const kind =
      filters.includes('all')
        ? 'all'
        : (filters.filter((f) => f !== 'ai') as PlaceKind[]);
    void placesService.searchWithMeta({ near: coords, kind }).then(({ places, meta }) => {
      setPlaces(places, meta);
    });
  }, [coords, filters, setPlaces]);

  useEffect(() => {
    if (!selectedPlaceId) {
      setRoute(null);
      return;
    }
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    let cancelled = false;
    void routingService.getRoute(coords, { lat: place.lat, lng: place.lng }).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPlaceId, places, coords, setRoute]);

  const visible = useMemo(() => {
    if (filters.includes('all')) return places;
    return places.filter((p) => filters.includes(p.kind));
  }, [places, filters]);

  const selected = places.find((p) => p.id === selectedPlaceId);

  return (
    <section
      aria-label="Live emergency map"
      className={cn(
        'relative h-[var(--map-mobile-h)] min-h-[200px] w-full overflow-hidden bg-[#dce8f5] lg:h-full lg:min-h-0 lg:flex-1',
        className,
      )}
    >
      <MapCanvas
        center={coords}
        places={visible}
        selectedId={selectedPlaceId}
        route={route}
        pitchMode={mapPitch}
        onSelect={setSelectedPlaceId}
        recenterKey={recenterKey}
      />

      <div className="absolute left-0 right-0 top-2 z-20 flex gap-1.5 overflow-x-auto px-2.5 no-scrollbar">
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            label={t(chip.labelKey)}
            icon={chip.icon}
            active={
              chip.id === 'all'
                ? filters.includes('all')
                : filters.includes(chip.id) && !filters.includes('all')
            }
            onClick={() => toggleFilter(chip.id)}
          />
        ))}
      </div>

      <div className="absolute right-2.5 top-12 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label={t('map.toggle3d')}
          onClick={() => setMapPitch(mapPitch === '3d' ? '2d' : '3d')}
          className="glass flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold text-text shadow-[var(--shadow-card)]"
        >
          <Icon name="layers3" size={13} className="text-primary" />
          {mapPitch === '3d' ? '3D' : '2D'}
        </button>
        <button
          type="button"
          aria-label={t('map.recenter')}
          onClick={() => setRecenterKey((k) => k + 1)}
          className="glass flex h-8 w-8 items-center justify-center rounded-full text-text shadow-[var(--shadow-card)]"
        >
          <Icon name="locateFixed" size={15} className="text-primary" />
        </button>
      </div>

      {(usingSampleLocation || placesMeta?.offline || placesMeta?.refreshing || selected || route) && (
        <div className="absolute bottom-14 left-2.5 right-2.5 z-20 space-y-1.5 lg:bottom-3 lg:right-auto lg:max-w-sm">
          {usingSampleLocation && (
            <div className="glass rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-text-secondary shadow-[var(--shadow-card)]">
              {t('map.sampleLocation')}
            </div>
          )}
          {placesMeta?.offline && (
            <div className="glass rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-sos shadow-[var(--shadow-card)]">
              {t('places.offlineBanner')}
            </div>
          )}
          {placesMeta?.refreshing && !placesMeta.offline && (
            <div className="glass rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-primary shadow-[var(--shadow-card)]">
              {t('places.findingHelp')}
            </div>
          )}
          {selected && route && (
            <div className="glass rounded-lg px-2.5 py-2 shadow-[var(--shadow-float)]">
              <p className="truncate text-xs font-bold text-text">{selected.name}</p>
              <p className="mt-0.5 text-[11.5px] text-text-secondary">
                {route.distanceKm.toFixed(1)} {t('common.km')} · {route.durationMin} {t('common.min')} ·{' '}
                {selected.address}
              </p>
              {selected.phone ? (
                <a
                  href={`tel:${selected.phone.replace(/\s/g, '')}`}
                  className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-on-primary"
                >
                  <Icon name="phone" size={12} />
                  {t('common.call')} {selected.phone}
                </a>
              ) : (
                <p className="mt-1.5 text-[11.5px] font-semibold text-text-secondary">
                  {t('places.phoneUnavailable')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-1 left-2 z-10 max-w-[70%] rounded bg-surface/85 px-1.5 py-0.5 text-[11px] font-semibold leading-snug text-text-secondary">
        {t('map.osmAttribution')}
        {hasMapboxDirections ? ` · ${t('map.mapboxAttribution')}` : ''}
      </div>
    </section>
  );
}
