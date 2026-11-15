import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, LanguageToggle, LocationChip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/hooks/useMediaQuery';

const nav = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/hospitals', labelKey: 'services.hospitals' },
  { to: '/blood', labelKey: 'services.blood' },
  { to: '/ambulance', labelKey: 'services.ambulance' },
  { to: '/voice', labelKey: 'services.ai' },
  { to: '/map', labelKey: 'nav.map' },
  { to: '/whatsapp', labelKey: 'nav.whatsapp' },
] as const;

export function TopBar() {
  const { t } = useTranslation();
  const desktop = useIsDesktop();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-bg/90 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-2 lg:px-4">
        <div className="flex h-12 w-full items-center justify-between gap-2 rounded-full bg-primary pl-1.5 pr-1.5 shadow-[var(--shadow-voice)] lg:pl-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary-dark ring-2 ring-white/20">
              <Icon name="heartPulse" size={18} strokeWidth={2.25} />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-white">
              HelpMe<span className="text-accent">.</span>
            </span>
          </Link>

          {desktop && (
            <nav className="flex items-center gap-0.5">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    cn(
                      'relative whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-accent' : 'text-white/80 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t(item.labelKey)}
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-1.5">
            {desktop && <LocationChip className="max-w-[160px]" />}
            <LanguageToggle compact={!desktop} />
            <Link
              to="/sos"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sos px-3.5 text-[13px] font-bold text-on-sos shadow-[var(--shadow-sos)] transition-transform active:scale-95"
            >
              <Icon name="siren" size={16} />
              <span>SOS</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
