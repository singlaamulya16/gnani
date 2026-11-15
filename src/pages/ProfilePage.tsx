import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmergencyBanner, Icon, LanguageToggle } from '@/components/ui';

export function ProfilePage() {
  const { t } = useTranslation();

  const rows = [
    { to: '/donor/register', icon: 'droplet' as const, label: t('profile.becomeDonor') },
    { to: '/donor', icon: 'users' as const, label: t('profile.donorHome') },
    { to: '/register', icon: 'ambulance' as const, label: t('profile.registerProvider') },
    { to: '/hospital/dashboard', icon: 'hospital' as const, label: t('profile.hospitalDash') },
    { to: '/voice', icon: 'mic' as const, label: t('pages.voice') },
  ];

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">{t('pages.profile')}</h1>
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)]">
        <div>
          <p className="font-semibold">{t('profile.language')}</p>
          <p className="text-[12px] text-text-secondary">{t('profile.languageHint')}</p>
        </div>
        <LanguageToggle />
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.to}
            to={row.to}
            className="flex min-h-9 items-center justify-between rounded-[var(--radius-lg)] bg-surface px-3 shadow-[var(--shadow-card)]"
          >
            <span className="inline-flex items-center gap-3 font-semibold">
              <Icon name={row.icon} size={20} className="text-primary" />
              {row.label}
            </span>
            <Icon name="chevronRight" size={18} className="text-text-secondary" />
          </Link>
        ))}
      </div>
      <div className="rounded-[var(--radius-lg)] bg-surface-low p-3 text-[12px] text-text-secondary">
        <p className="font-semibold text-text">{t('profile.demoTag')}</p>
        <p className="mt-1">{t('profile.demoBody')}</p>
        <p className="mt-3 font-semibold text-text">{t('profile.contacts')}</p>
        <p className="mt-1">Asha · +91 90000 00999 (Demo)</p>
        <p className="mt-3">
          <a className="font-semibold text-primary" href="/driver">
            {t('profile.driver')}
          </a>
          {' · '}
          <a className="font-semibold text-primary" href="/admin">
            {t('profile.admin')}
          </a>
        </p>
      </div>
    </div>
  );
}
