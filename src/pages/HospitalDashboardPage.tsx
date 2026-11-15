import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEMO_HOSPITAL_BLOOD_STOCK } from '@/data/sample/demoHospitalStock';
import { SAMPLE_HOSPITAL_DASHBOARD } from '@/data/sample';
import { EmergencyBanner, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';

export function HospitalDashboardPage() {
  const { t } = useTranslation();
  const dash = SAMPLE_HOSPITAL_DASHBOARD;
  const stock = DEMO_HOSPITAL_BLOOD_STOCK;
  const [beds, setBeds] = useState(dash.stats.icuBedsFree);
  const [amb, setAmb] = useState(dash.stats.ambulancesFree);

  const cards = [
    { label: t('hospital.active'), value: dash.stats.activeRequests, icon: 'bell' as const },
    { label: t('hospital.bloodUnits'), value: dash.stats.bloodUnits, icon: 'droplet' as const },
    { label: t('hospital.icuBeds'), value: beds, icon: 'bed' as const },
    { label: t('hospital.ambulances'), value: amb, icon: 'ambulance' as const },
  ];

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">
        {t('pages.hospitalDash')}
      </h1>
      <p className="text-[12px] text-text-secondary">Sample City Hospital (Demo)</p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)]">
            <Icon name={c.icon} size={18} className="text-primary" />
            <p className="mt-2 text-sm font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-text-secondary">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBeds((b) => Math.max(0, b - 1))}
          className="min-h-10 flex-1 rounded-[var(--radius-lg)] bg-surface-low text-[12px] font-semibold"
        >
          {t('hospital.useBed')}
        </button>
        <button
          type="button"
          onClick={() => setAmb((a) => (a > 0 ? a - 1 : a + 1))}
          className={cn(
            'min-h-10 flex-1 rounded-[var(--radius-lg)] text-[12px] font-semibold',
            amb > 0 ? 'bg-primary text-on-primary' : 'bg-sos text-on-sos',
          )}
        >
          {t('hospital.toggleAmb')}
        </button>
      </div>

      <h2 className="font-semibold">{t('hospital.incoming')}</h2>
      <div className="space-y-2">
        {dash.incoming.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="font-semibold">{item.need}</p>
              <p className="text-xs text-text-secondary">
                {item.distanceKm} km · {item.etaMin} min
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2 py-1 text-[11px] font-bold uppercase',
                item.urgency === 'high' ? 'bg-sos-soft text-sos' : 'bg-primary-soft text-primary',
              )}
            >
              {item.urgency}
            </span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold">{t('hospital.stock')}</h2>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(stock).map(([g, n]) => (
          <div key={g} className="rounded-[var(--radius-md)] bg-surface-low p-2 text-center">
            <p className="text-xs font-semibold text-text-secondary">{g}</p>
            <p className="text-sm font-bold tabular-nums">{n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
