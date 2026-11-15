import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui';

const cols = [
  {
    title: 'Services',
    links: [
      { to: '/hospitals', label: 'Hospitals' },
      { to: '/blood', label: 'Find blood' },
      { to: '/ambulance', label: 'Ambulance' },
      { to: '/doctors', label: 'Doctors & clinics' },
      { to: '/pharmacy', label: 'Pharmacies' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { to: '/donor/register', label: 'Become a donor' },
      { to: '/register', label: 'Register a hospital' },
      { to: '/driver', label: 'Ambulance drivers' },
      { to: '/hospital/dashboard', label: 'Hospital dashboard' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/agent', label: 'SOS Agent' },
      { to: '/voice', label: 'AI voice helper' },
      { to: '/map', label: 'Live map' },
      { to: '/requests', label: 'My requests' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-primary pt-12 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 pb-10 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-10">
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark">
              <Icon name="heartPulse" size={20} strokeWidth={2.25} />
            </span>
            <span className="font-[family-name:var(--font-display)] text-[22px] font-semibold">
              HelpMe<span className="text-accent">.</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/75">
            Emergency medical help for every Indian, in every language. Hospitals, blood, ambulances and doctors — one sentence away.
          </p>
          <div className="mt-4 flex gap-2">
            {[
              { n: '112', l: 'National' },
              { n: '108', l: 'Emergency' },
              { n: '102', l: 'Ambulance' },
            ].map((x) => (
              <a key={x.n} href={`tel:${x.n}`} className="rounded-xl bg-white/10 px-3 py-2 text-center hover:bg-white/15">
                <span className="block font-[family-name:var(--font-display)] text-[18px] font-semibold text-accent">{x.n}</span>
                <span className="text-[11px] text-white/70">{x.l}</span>
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-accent">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[14px] text-white/80 transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[12.5px] text-white/60 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>© 2026 HelpMe · Built for the Great Indian AI Internship Challenge</span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Voice by <span className="font-semibold text-accent">Gnani AI</span> (Prisma + Timbre)</span>
            <span>Map data © OpenStreetMap contributors</span>
            <span>Demo donors are simulated</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
