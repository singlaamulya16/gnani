import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmergencyBanner, EmptyState, Icon } from '@/components/ui';
import { requestService } from '@/services/requestService';
import type { SampleRequest } from '@/types/domain';
import { cn } from '@/lib/cn';

export function RequestsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SampleRequest[]>([]);
  const [tab, setTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    void requestService.list().then(setItems);
  }, []);

  const active = items.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
  const past = items.filter((r) => r.status === 'Completed' || r.status === 'Cancelled');
  const list = tab === 'active' ? active : past;

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.requests')}</h1>
      <EmergencyBanner />
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] bg-surface-low p-1">
        {(['active', 'past'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'min-h-9 rounded-[var(--radius-md)] text-[12px] font-semibold',
              tab === key ? 'bg-primary text-on-primary' : 'text-text-secondary',
            )}
          >
            {t(`requests.${key}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {list.map((req) => (
            <div
              key={req.id}
              className="rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon name={req.kind === 'ambulance' ? 'ambulance' : 'droplet'} size={18} />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {req.kind === 'blood'
                        ? `${req.bloodGroup ?? ''} · ${req.units ?? 1} ${t('blood.units')}`
                        : t('pages.ambulance')}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-[11px] font-bold',
                    req.status === 'Completed'
                      ? 'bg-primary-soft text-primary'
                      : 'bg-sos-soft text-sos',
                  )}
                >
                  {req.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
