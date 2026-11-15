import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';

const items: { to: string; labelKey: string; icon: IconName; end?: boolean }[] = [
  { to: '/', labelKey: 'nav.home', icon: 'home', end: true },
  { to: '/map', labelKey: 'nav.map', icon: 'map' },
  { to: '/requests', labelKey: 'nav.requests', icon: 'listChecks' },
  { to: '/profile', labelKey: 'nav.profile', icon: 'userRound' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-safe backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex h-[var(--bottom-nav-h)] max-w-lg items-stretch justify-around px-1">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-0 text-[11.5px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-10 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <Icon name={item.icon} size={18} strokeWidth={isActive ? 2.1 : 1.75} />
                  </span>
                  {t(item.labelKey)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
