import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FilterChip, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { IMAGES, placePhoto } from '@/lib/images';
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

export function MapPanel({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'sidebar' }) {
  const sidebar = variant === 'sidebar';
  const locationLabel = useAppStore((s) => s.locationLabel);
  const gpsAccuracyM = useAppStore((s) => s.gpsAccuracyM);
  const [focusUser, setFocusUser] = useState(false);
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
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
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
    // Radar scan for at least ~1.6s so the search feels alive, then markers pop in
    setScanning(true);
    let cancelled = false;
    const started = Date.now();
    void placesService.searchWithMeta({ near: coords, kind }).then(async ({ places, meta }) => {
      const wait = Math.max(0, 1600 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (cancelled) return;
      setPlaces(places, meta);
      setScanning(false);
    });
    return () => {
      cancelled = true;
    };
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
  const [remote, setRemote] = useState<typeof places>([]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }
    const id = window.setTimeout(() => {
      void placesService.searchWithMeta({ near: coords, kind: 'all', q, radiusM: 30000 }).then(({ places: found }) => setRemote(found));
    }, 250);
    return () => window.clearTimeout(id);
  }, [query, coords]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hit = (p: (typeof places)[number]) =>
      p.kind !== 'donor' && (p.name.toLowerCase().includes(q) || Boolean(p.address?.toLowerCase().includes(q)));
    const local = places.filter(hit);
    const seen = new Set(local.map((p) => p.id));
    return [...local, ...remote.filter((p) => hit(p) && !seen.has(p.id))]
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [places, remote, query]);
  const pick = (p: (typeof places)[number]) => {
    if (!places.some((x) => x.id === p.id)) setPlaces([p, ...places]);
    setSelectedPlaceId(p.id);
    setQuery('');
  };

  return (
    <div className={cn('flex h-full min-h-0 w-full gap-3', sidebar ? 'flex-col-reverse lg:flex-row' : 'flex-col', className)}>
      {/* Toolbar outside the map: filters + search */}
      <div className={cn('relative z-30 flex items-center gap-2', sidebar && 'hidden')}>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
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
        <div className="relative w-44 shrink-0 lg:w-56">
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) pick(matches[0]);
            }}
            placeholder="Search places…"
            className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-[13px] shadow-[var(--shadow-card)] outline-none focus:border-primary"
          />
          {query.trim() && (
            <div className="absolute right-0 top-11 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]">
              {matches.length ? (
                matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] hover:bg-accent-soft"
                  >
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className="shrink-0 text-[12px] text-text-secondary">{Number(p.distanceKm).toFixed(1)} km</span>
                  </button>
                ))
              ) : (
                <p className="px-3.5 py-3 text-[13px] text-text-secondary">No matching places nearby</p>
              )}
            </div>
          )}
        </div>
      </div>

    <section
      aria-label="Live emergency map"
      className={cn('relative w-full flex-1 overflow-hidden rounded-[28px] border border-border bg-[#dce8f5] shadow-[var(--shadow-float)]', sidebar ? 'min-h-[420px] lg:min-h-0' : 'min-h-[200px]')}
    >
      <MapCanvas
        center={coords}
        places={visible}
        selectedId={selectedPlaceId}
        route={route}
        pitchMode={mapPitch}
        onSelect={setSelectedPlaceId}
        recenterKey={recenterKey}
        focusUser={focusUser}
        scanning={scanning}
      />
      {scanning && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-[var(--shadow-float)]">
          <span className="mr-1.5 inline-block h-2 w-2 animate-ping rounded-full bg-accent" />
          Scanning nearby…
        </div>
      )}
      {!scanning && visible.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-surface px-4 py-1.5 text-[12.5px] font-semibold text-text shadow-[var(--shadow-float)]">
          {visible.length} found · <span className="text-success">{visible.filter((p) => p.phone).length} reachable by phone</span>
        </div>
      )}


      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
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

      {(usingSampleLocation || placesMeta?.offline || placesMeta?.refreshing || selected) && (
        <div className="absolute bottom-3 left-3 right-3 z-20 space-y-1.5 sm:right-auto sm:max-w-sm">
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
          {selected && (
            <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-float)]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-semibold leading-snug text-text">{selected.name}</p>
                <button type="button" onClick={() => setSelectedPlaceId(null)} aria-label="Close" className="text-text-secondary hover:text-text">
                  <Icon name="x" size={16} />
                </button>
              </div>
              <p className="mt-0.5 text-[12.5px] text-text-secondary">
                {route ? `${route.distanceKm.toFixed(1)} ${t('common.km')} · ${route.durationMin} ${t('common.min')} · ` : `${selected.distanceKm} ${t('common.km')} · `}
                {selected.address || 'Address not listed'}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
                >
                  <Icon name="navigation" size={14} /> Open in Google Maps
                </a>
                {selected.phone ? (
                  <a
                    href={`tel:${selected.phone.split(/[;,]/)[0]!.replace(/\s/g, '')}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-semibold text-on-primary"
                  >
                    <Icon name="phone" size={14} />
                    {t('common.call')}
                  </a>
                ) : (
                  <span className="inline-flex h-9 items-center text-[12px] font-semibold text-text-secondary">
                    {t('places.phoneUnavailable')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-1 left-2 z-10 max-w-[70%] rounded bg-surface/85 px-1.5 py-0.5 text-[11px] font-semibold leading-snug text-text-secondary">
        {t('map.osmAttribution')}
        {hasMapboxDirections ? ` · ${t('map.mapboxAttribution')}` : ''}
      </div>
    </section>

      {sidebar && (
        <aside className="relative z-30 flex w-full shrink-0 flex-col gap-3 lg:w-[22%] lg:min-w-[230px]">
          {/* your location */}
          <div className="rounded-2xl bg-primary p-3.5 text-white shadow-[var(--shadow-voice)]">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Your location
            </span>
            <span className="mt-1 block font-[family-name:var(--font-display)] text-[16px] font-semibold leading-tight">{locationLabel}</span>
            <span className="text-[12px] text-white/70">
              {gpsAccuracyM != null ? `GPS ± ${gpsAccuracyM} m` : 'Approximate — allow GPS for exact spot'}
            </span>
            <button
              type="button"
              onClick={() => setFocusUser((f) => !f)}
              className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-accent text-[13px] font-semibold text-primary-dark"
            >
              <Icon name={focusUser ? 'map' : 'locateFixed'} size={16} />
              {focusUser ? 'Back to results' : 'Zoom to me'}
            </button>
          </div>

          {/* search */}
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches[0]) pick(matches[0]);
              }}
              placeholder="Search places…"
              className="h-11 w-full rounded-full border-2 border-accent/50 bg-surface pl-10 pr-3 text-[13.5px] shadow-[var(--shadow-card)] outline-none focus:border-primary"
            />
            {query.trim() && (
              <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]">
                {matches.length ? (
                  matches.map((p) => (
                    <button key={p.id} type="button" onClick={() => pick(p)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] hover:bg-accent-soft">
                      <span className="truncate font-semibold">{p.name}</span>
                      <span className="shrink-0 text-[12px] text-text-secondary">{Number(p.distanceKm).toFixed(1)} km</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3.5 py-3 text-[13px] text-text-secondary">No matching places nearby</p>
                )}
              </div>
            )}
          </div>

          {/* 6 services as image tiles, 2 per row */}
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 lg:grid-cols-2">
            {chips.map((chip) => {
              const active =
                chip.id === 'all' ? filters.includes('all') : filters.includes(chip.id) && !filters.includes('all');
              const count = chip.id === 'all' ? places.length : places.filter((p) => p.kind === chip.id || (chip.id === 'clinic' && p.kind === 'doctor')).length;
              const img = chip.id === 'all' ? IMAGES.heroDoctor : placePhoto(chip.id === 'blood_bank' ? 'blood_bank' : chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleFilter(chip.id)}
                  className={cn(
                    'group relative min-h-[72px] overflow-hidden rounded-xl text-left transition-all',
                    active ? 'ring-[3px] ring-accent' : 'ring-1 ring-border hover:ring-2 hover:ring-accent/60',
                  )}
                >
                  <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <span className={cn('absolute inset-0', active ? 'bg-gradient-to-t from-primary via-primary/70 to-primary/20' : 'bg-gradient-to-t from-black/75 via-black/35 to-transparent')} />
                  <span className="absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-1">
                    <span className="flex items-center gap-1 text-[12.5px] font-semibold leading-tight text-white">
                      <Icon name={chip.icon} size={13} className="shrink-0 text-accent" />
                      {t(chip.labelKey)}
                    </span>
                    {count > 0 && <span className="rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-primary-dark">{count}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
}
