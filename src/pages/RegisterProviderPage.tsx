import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmergencyBanner } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

type Kind = 'ambulance' | 'ngo' | 'doctor';

export function RegisterProviderPage() {
  const { t } = useTranslation();
  const coords = useAppStore((s) => s.coords);
  const [kind, setKind] = useState<Kind>('ambulance');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      const res = await apiFetch(`/api/register/${kind}`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone,
          address,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      if (!res.ok) throw new Error('fail');
      setDone(true);
    } catch {
      setError(t('register.failed'));
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.register')}</h1>
      <EmergencyBanner />
      {done ? (
        <p className="rounded-xl bg-primary-soft p-3 text-[13px] font-semibold text-primary">
          {t('register.pending')}
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            {(['ambulance', 'ngo', 'doctor'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`min-h-9 flex-1 rounded-lg text-xs font-bold ${
                  kind === k ? 'bg-primary text-on-primary' : 'bg-surface-low'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            className="h-10 rounded-xl bg-surface-low px-3"
            placeholder={t('register.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-10 rounded-xl bg-surface-low px-3"
            placeholder={t('register.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="h-10 rounded-xl bg-surface-low px-3"
            placeholder={t('register.address')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {error && <p className="text-[12px] font-semibold text-sos">{error}</p>}
          <Button fullWidth disabled={!name.trim()} onClick={() => void submit()}>
            {t('register.submit')}
          </Button>
        </>
      )}
    </div>
  );
}
