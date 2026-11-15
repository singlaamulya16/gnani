import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmergencyBanner, useToastStore } from '@/components/ui';
import { cn } from '@/lib/cn';

export function DonorHomePage() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [available, setAvailable] = useState(true);
  const [pending, setPending] = useState(true);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.donorHome')}</h1>
      <EmergencyBanner />
      <button
        type="button"
        onClick={() => setAvailable((v) => !v)}
        className={cn(
          'flex min-h-10 items-center justify-between rounded-[var(--radius-xl)] px-3 font-semibold shadow-[var(--shadow-card)]',
          available ? 'bg-primary text-on-primary' : 'bg-surface text-text-secondary',
        )}
      >
        <span>{t('donor.availability')}</span>
        <span>{available ? t('donor.available') : t('donor.unavailable')}</span>
      </button>

      {pending && (
        <div className="space-y-3 rounded-[var(--radius-xl)] bg-surface p-3 shadow-[var(--shadow-card)]">
          <p className="font-semibold">{t('donor.activeRequest')}</p>
          <p className="text-[12px] text-text-secondary">B+ · 2 units · Sample City Hospital (Demo)</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              onClick={() => {
                setPending(false);
                push(t('donor.declined'), 'danger');
              }}
            >
              {t('donor.decline')}
            </Button>
            <Button
              onClick={() => {
                setPending(false);
                push(t('donor.accepted'), 'success');
              }}
            >
              {t('donor.accept')}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] bg-surface-low p-4">
        <p className="font-semibold">{t('donor.history')}</p>
        <p className="mt-2 text-[12px] text-text-secondary">O- request · Completed · yesterday (Demo)</p>
      </div>
    </div>
  );
}
