import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BloodGroupGrid,
  Button,
  EmergencyBanner,
  EmptyState,
  PlaceCard,
  PlaceCardSkeleton,
  StatusTimeline,
  useToastStore,
  type BloodGroup,
} from '@/components/ui';
import { donorService } from '@/services/donorService';
import { placesService } from '@/services/placesService';
import { requestService } from '@/services/requestService';
import { useAppStore } from '@/store/appStore';
import type { SampleRequest } from '@/types/domain';

type Phase = 'form' | 'results' | 'tracking';

export function BloodPage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const setPlaces = useAppStore((s) => s.setPlaces);
  const places = useAppStore((s) => s.places);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const setActiveFilters = useAppStore((s) => s.setActiveFilters);
  const push = useToastStore((s) => s.push);
  const [params] = useSearchParams();
  const voiceGroup = params.get('group') as BloodGroup | null;
  const voiceUnits = Number(params.get('units')) || null;
  const [group, setGroup] = useState<BloodGroup>(voiceGroup ?? 'B+');
  const [units, setUnits] = useState(voiceUnits ?? 2);
  const [phase, setPhase] = useState<Phase>('form');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<SampleRequest | null>(null);
  const [donors, setDonors] = useState<Awaited<ReturnType<typeof donorService.listNearby>>>([]);

  useEffect(() => {
    setActiveFilters(['blood_bank', 'donor']);
  }, [setActiveFilters]);

  const search = async (g: BloodGroup = group) => {
    setLoading(true);
    const [{ places: banks, meta }, donorList] = await Promise.all([
      placesService.searchWithMeta({ near: coords, kind: 'blood_bank' }),
      donorService.listNearby(coords, g),
    ]);
    setPlaces(banks, meta);
    setDonors(donorList);
    setLoading(false);
    setPhase('results');
  };

  // Filled by voice ("B+ blood chahiye, 2 units"): jump straight to results.
  useEffect(() => {
    if (!voiceGroup) return;
    setGroup(voiceGroup);
    if (voiceUnits) setUnits(voiceUnits);
    void search(voiceGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceGroup, voiceUnits]);

  const request = async () => {
    const req = await requestService.createBloodRequest({ bloodGroup: group, units });
    setActive(req);
    setPhase('tracking');
    push(t('blood.requestSent'), 'success');
    requestService.simulateBloodProgress(req.id, setActive);
  };

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.blood')}</h1>
      <EmergencyBanner />

      {phase === 'form' && (
        <>
          <p className="text-[12px] text-text-secondary">{t('blood.pickGroup')}</p>
          <BloodGroupGrid value={group} onChange={setGroup} />
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="flex h-10 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)] text-base font-bold"
              onClick={() => setUnits((u) => Math.max(1, u - 1))}
            >
              −
            </button>
            <span className="w-28 text-center text-base font-bold text-primary">
              {units} {t('blood.units')}
            </span>
            <button
              type="button"
              className="flex h-10 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)] text-base font-bold"
              onClick={() => setUnits((u) => Math.min(6, u + 1))}
            >
              +
            </button>
          </div>
          <Button fullWidth icon="droplet" onClick={() => void search()}>
            {t('blood.findMatches')}
          </Button>
        </>
      )}

      {phase === 'results' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('blood.matches')}</h2>
            <button type="button" className="text-[12px] font-semibold text-primary" onClick={() => setPhase('form')}>
              {t('common.cancel')}
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PlaceCardSkeleton />
              <PlaceCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {places.filter((p) => p.kind === 'blood_bank').map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  selected={selectedPlaceId === place.id}
                  onSelect={() => setSelectedPlaceId(place.id)}
                />
              ))}
              {donors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedPlaceId(d.id)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-surface p-3 text-left shadow-[var(--shadow-card)]"
                >
                  <span>
                    <span className="block font-semibold">
                      {d.firstName} · {d.bloodGroup}
                    </span>
                    <span className="text-[12px] text-text-secondary">
                      {d.distanceKm.toFixed(1)} {t('common.km')} · {t('blood.demoDonor')}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                    {t('blood.eligible')}
                  </span>
                </button>
              ))}
              {!places.some((p) => p.kind === 'blood_bank') && !donors.length && <div className="sm:col-span-2"><EmptyState /></div>}
              <Button fullWidth className="sm:col-span-2" onClick={() => void request()}>
                {t('blood.sendRequest')}
              </Button>
            </div>
          )}
        </>
      )}

      {phase === 'tracking' && active && (
        <div className="space-y-3 rounded-[var(--radius-xl)] bg-surface p-3 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">{t('blood.tracking')}</h2>
          <StatusTimeline
            steps={[
              { id: '1', label: t('blood.status.searching'), done: active.status !== 'Searching', active: active.status === 'Searching' },
              {
                id: '2',
                label: t('blood.status.accepted'),
                done: ['On the way', 'Handover', 'Completed'].includes(active.status),
                active: active.status === 'Donor accepted',
              },
              {
                id: '3',
                label: t('blood.status.onWay'),
                done: ['Handover', 'Completed'].includes(active.status),
                active: active.status === 'On the way',
              },
              {
                id: '4',
                label: t('blood.status.handover'),
                done: active.status === 'Completed',
                active: active.status === 'Handover',
              },
            ]}
          />
          {active.handoverCode && (
            <div className="rounded-[var(--radius-lg)] bg-primary-soft p-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t('blood.handoverCode')}
              </p>
              <p className="mt-1 font-[family-name:var(--font-sans)] text-3xl font-bold tabular-nums text-primary">
                {active.handoverCode}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
