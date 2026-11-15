import {
  GeoJSONSource,
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ensureMapLibreWorker,
  STREET_RASTER_STYLE,
  STREET_STYLE,
  STREET_STYLE_FALLBACK,
} from '@/lib/maplibreSetup';
import type { MapPitch } from '@/store/appStore';
import type { Place, RouteResult } from '@/types/domain';

ensureMapLibreWorker();

const KIND_COLOR: Record<string, string> = {
  hospital: '#0E9F8E',
  clinic: '#525c6e',
  doctor: '#3d4946',
  pharmacy: '#008375',
  blood_bank: '#E53935',
  donor: '#db322f',
  ambulance: '#b7131a',
  ngo: '#00685c',
};

interface MapCanvasProps {
  center: { lat: number; lng: number };
  places: Place[];
  selectedId: string | null;
  route: RouteResult | null;
  pitchMode: MapPitch;
  onSelect: (id: string) => void;
  recenterKey: number;
}

function makeMarkerEl(place: Place, selected: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', place.name);
  const size = selected ? 44 : 36;
  btn.style.cssText = `
    width:${size}px;height:${size}px;border-radius:9999px;
    border:2.5px solid #fff;background:${KIND_COLOR[place.kind] ?? '#0E9F8E'};
    box-shadow:0 6px 16px rgba(26,36,51,.4);cursor:pointer;display:grid;place-items:center;
    color:#fff;font-size:13px;font-weight:800;font-family:Inter,system-ui,sans-serif;
  `;
  btn.textContent =
    place.kind === 'ambulance'
      ? 'A'
      : place.kind === 'hospital'
        ? 'H'
        : place.kind === 'pharmacy'
          ? 'P'
          : place.kind === 'clinic' || place.kind === 'doctor'
            ? 'C'
            : place.kind === 'donor'
              ? 'D'
              : place.kind === 'ngo'
                ? 'N'
                : 'B';
  return btn;
}

function addRouteLayer(map: Map) {
  if (map.getSource('route')) return;
  map.addSource('route', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#0E9F8E',
      'line-width': 5,
      'line-opacity': 0.95,
    },
  });
}

export function MapCanvas({
  center,
  places,
  selectedId,
  route,
  pitchMode,
  onSelect,
  recenterKey,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusMsg, setStatusMsg] = useState('Loading map…');
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    let fallbackStep = 0;

    let map: Map;
    try {
      map = new Map({
        container: el,
        style: STREET_RASTER_STYLE,
        center: [center.lng, center.lat],
        zoom: 14,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
        maxPitch: 60,
      });
    } catch (err) {
      // WebGL2 off/unsupported: keep the app usable (lists + voice still work).
      console.warn('[map] could not start', err);
      setStatus('error');
      setStatusMsg('Map needs WebGL2. Turn on hardware acceleration in browser settings. Lists and voice still work.');
      return;
    }

    map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
    mapRef.current = map;

    const markReady = () => {
      if (cancelled) return;
      addRouteLayer(map);
      map.resize();
      setStatus('ready');
      setStatusMsg('');
    };

    map.on('load', markReady);
    map.once('idle', markReady);

    // Safety: never leave the overlay stuck
    const safety = window.setTimeout(() => {
      if (!cancelled && mapRef.current) markReady();
    }, 2500);

    map.on('error', () => {
      if (cancelled) return;
      if (fallbackStep === 0) {
        fallbackStep = 1;
        setStatusMsg('Loading vector street map…');
        map.setStyle(STREET_STYLE);
        map.once('load', markReady);
        return;
      }
      if (fallbackStep === 1) {
        fallbackStep = 2;
        setStatusMsg('Loading backup map…');
        map.setStyle(STREET_STYLE_FALLBACK);
        map.once('load', markReady);
        return;
      }
      setStatus('error');
      setStatusMsg('Map tiles failed to load');
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    const t1 = window.setTimeout(() => map.resize(), 80);
    const t2 = window.setTimeout(() => map.resize(), 350);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center: [center.lng, center.lat], duration: 700 });

    userMarkerRef.current?.remove();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:22px;height:22px;position:relative;';
    wrap.innerHTML = `
      <span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(14,159,142,.28)"></span>
      <span style="position:absolute;inset:0;border-radius:9999px;background:#0E9F8E;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35)"></span>`;
    userMarkerRef.current = new Marker({ element: wrap })
      .setLngLat([center.lng, center.lat])
      .addTo(map);
  }, [center.lat, center.lng, recenterKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Raster basemap: keep pitch mild so it still feels like a normal map
    map.easeTo({
      pitch: pitchMode === '3d' ? 45 : 0,
      duration: 450,
    });
  }, [pitchMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const btn = makeMarkerEl(place, place.id === selectedId);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(place.id);
      });
      markersRef.current.push(
        new Marker({ element: btn, anchor: 'center' })
          .setLngLat([place.lng, place.lat])
          .addTo(map),
      );
    });

    const selected = places.find((p) => p.id === selectedId);
    if (selected) {
      map.flyTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(map.getZoom(), 14.6),
        duration: 900,
      });
    }
  }, [places, selectedId, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;

    const apply = () => {
      addRouteLayer(map);
      const source = map.getSource('route') as GeoJSONSource | undefined;
      if (!source) return;
      if (!route) {
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
      }
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry,
      });
      const coords = route.geometry.coordinates;
      if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as [number, number]),
          new LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]),
        );
        map.fitBounds(bounds, { padding: 72, duration: 900, maxZoom: 15 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [route, status]);

  return (
    <div className="absolute inset-0 h-full w-full bg-[#cfd8e3]">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[#cfd8e3]/90">
          <p className="mx-4 max-w-sm rounded-2xl bg-surface px-4 py-2 text-center text-sm font-semibold text-text shadow-[var(--shadow-card)]">
            {statusMsg || (status === 'error' ? 'Map unavailable' : 'Loading map…')}
          </p>
        </div>
      )}
    </div>
  );
}
