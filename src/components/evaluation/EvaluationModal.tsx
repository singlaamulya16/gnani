import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, SmartImage, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';
import { IMAGES } from '@/lib/images';

/** ▶ Paste your YouTube demo link here, e.g. 'https://youtu.be/XXXXXXXXXXX' */
export const DEMO_VIDEO_URL = '';

type Tab = 'video' | 'workflow' | 'details';

function toEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/* ---------------- shared bits ---------------- */

function Title({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-semibold leading-tight">{children}</h3>
    </div>
  );
}

function Photo({ src, label, className }: { src: string; label?: string; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-surface-mid', className)}>
      <SmartImage src={src} alt={label ?? ''} className="absolute inset-0 h-full w-full object-cover" fallback={<span />} />
      {label && (
        <span className="absolute bottom-2 left-2 rounded-full bg-primary/90 px-3 py-1 text-[12px] font-semibold text-white">{label}</span>
      )}
    </div>
  );
}

function Bullets({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className={cn('flex gap-2 text-[13.5px] leading-snug', dark ? 'text-white/90' : 'text-text')}>
          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', dark ? 'bg-accent' : 'bg-primary')} />
          {t}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Mermaid diagram (loaded from CDN at runtime) ---------------- */

const FLOW = `flowchart TD
  U(["User in an emergency<br/>Hindi · English · Hinglish"]):::user
  M["Browser mic<br/>16 kHz WAV · auto-stop on silence"]
  P["HelpMe server proxy<br/>/api/voice/stt · key stays server-side"]
  S{{"GNANI PRISMA v3.0 · Speech-to-Text<br/>hi-IN,en-IN code-mix · medical keyterms"}}:::gnani
  A{"HelpMe Agent<br/>what is needed?"}:::agent
  E["Emergency<br/>accident · labour · head injury · chest pain"]:::red
  B["Blood<br/>group · units"]:::red
  H["Hospital · Doctor · Medicine"]
  X["Off-topic<br/>polite 'not relevant'"]:::muted
  D1["Dispatch nearest ambulance<br/>+ alert hospital · ETA"]
  F1["First-aid steps<br/>for that condition"]
  B1["Blood banks (OpenStreetMap)<br/>+ compatible donors"]
  R1["Blood request #ID<br/>live status"]
  H1["Nearest places (OSM)<br/>route + Google Maps"]
  W["WhatsApp alert<br/>Accept / Reject"]:::wa
  C["Start code shared<br/>+ live location"]:::wa
  T{{"GNANI TIMBRE v2.5 · Text-to-Speech<br/>Nalini · Devika · Poorvi (Hinglish)"}}:::gnani
  O(["Spoken reply in user's language"]):::user

  U --> M --> P --> S --> A
  A -->|emergency| E --> D1 --> F1
  A -->|blood| B --> B1 --> R1
  A -->|place| H --> H1
  A -->|other| X
  D1 --> W
  R1 --> W --> C
  F1 --> T
  R1 --> T
  H1 --> T
  X --> T
  C -.->|updates| T
  T --> O
  O -.->|hands-free: listens again| U

  classDef gnani fill:#2e4a36,stroke:#f5a623,stroke-width:3px,color:#ffffff,font-weight:bold
  classDef agent fill:#f5a623,stroke:#2e4a36,stroke-width:2px,color:#1f2a22,font-weight:bold
  classDef user fill:#ffffff,stroke:#2e4a36,stroke-width:2px,color:#1c2820
  classDef red fill:#ffe3e1,stroke:#e5383b,stroke-width:2px,color:#1c2820
  classDef wa fill:#d9fdd3,stroke:#25D366,stroke-width:2px,color:#1c2820
  classDef muted fill:#f2f5ef,stroke:#9aa79e,color:#5c6a61
`;

type MermaidApi = { initialize: (c: object) => void; render: (id: string, src: string) => Promise<{ svg: string }> };
let mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    const url = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaidPromise = import(/* @vite-ignore */ url).then((m: { default: MermaidApi }) => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: { curve: 'basis', padding: 14, nodeSpacing: 34, rankSpacing: 48 },
        themeVariables: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '14px',
          primaryColor: '#ffffff',
          primaryBorderColor: '#2e4a36',
          lineColor: '#2e4a36',
          edgeLabelBackground: '#fff3db',
        },
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

function MermaidFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    loadMermaid()
      .then((m) => m.render(`helpme-flow-${Date.now()}`, FLOW))
      .then(({ svg }) => {
        if (alive && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-border bg-[radial-gradient(#dde5d8_1px,transparent_1px)] bg-[length:18px_18px] p-4">
      {err ? (
        <p className="p-6 text-center text-[13px] text-text-secondary">Diagram needs internet to load (Mermaid CDN).</p>
      ) : (
        <div ref={ref} className="mx-auto flex min-h-[300px] justify-center [&_svg]:h-auto [&_svg]:max-w-full">
          <p className="self-center text-[13px] text-text-secondary">Drawing workflow…</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- VIDEO ---------------- */

function VideoTab() {
  const embed = toEmbed(DEMO_VIDEO_URL);
  return (
    <div className="space-y-5">
      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[var(--shadow-float)]">
          <iframe
            src={embed}
            title="HelpMe demo video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-primary">
          <div className="absolute inset-0 grid grid-cols-3 opacity-40">
            <Photo src={IMAGES.ambulance} className="rounded-none" />
            <Photo src={IMAGES.heroDoctor} className="rounded-none" />
            <Photo src={IMAGES.hospital} className="rounded-none" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/30" />
          <div className="relative flex h-full flex-col items-center justify-center gap-3 text-center text-white">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sos shadow-[var(--shadow-sos)]">
              <Icon name="activity" size={28} />
            </span>
            <p className="font-[family-name:var(--font-display)] text-[24px] font-semibold">HelpMe · 90-second demo</p>
            <p className="text-[13px] text-white/75">Video link will appear here</p>
          </div>
        </div>
      )}
      {DEMO_VIDEO_URL && (
        <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-sos px-5 text-[14px] font-semibold text-white">
          Watch on YouTube
        </a>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: '0:00', d: 'Hinglish voice SOS → agent acts instantly', img: IMAGES.heroDoctor },
          { t: '0:30', d: 'Blood → donors → WhatsApp accept, code, live location', img: IMAGES.blood },
          { t: '1:00', d: 'Page voice + live map of real hospitals', img: IMAGES.hospital },
        ].map((s) => (
          <div key={s.t} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Photo src={s.img} className="h-28 rounded-none" />
            <div className="p-3">
              <span className="text-[12px] font-bold text-accent-dark">{s.t}</span>
              <p className="text-[13.5px] font-medium">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- WORKFLOW ---------------- */

const GNANI_USES: { icon: IconName; title: string; points: string[] }[] = [
  { icon: 'siren', title: 'SOS Agent', points: ['Hands-free loop: Prisma listens → agent acts → Timbre speaks', 'User never touches the screen'] },
  { icon: 'mic', title: 'Voice on every page', points: ['Hospitals, Blood, Ambulance, Doctors, Pharmacy, Map', 'Off-page requests hand off to the agent'] },
  { icon: 'languages', title: 'Hinglish / code-mix', points: ['Prisma "hi-IN,en-IN" + keyterms', 'Timbre hi-en voice (Poorvi) replies naturally'] },
  { icon: 'shieldAlert', title: 'Spoken first aid', points: ['13 emergency types', 'Steps read aloud in caller’s language'] },
];

const FUTURE: { icon: IconName; title: string; point: string; tag?: string }[] = [
  { icon: 'phone', title: 'Live phone-call agent', point: 'Toll-free call from any feature phone · Bolna.ai voice-call agents + Gnani Indic speech', tag: 'Next' },
  { icon: 'activity', title: 'Streaming voice', point: 'Prisma WebSocket + Timbre SSE · sub-second, interruptible' },
  { icon: 'ambulance', title: 'Real 108 / 102 dispatch', point: 'State operators + live vehicle GPS' },
  { icon: 'droplet', title: 'Live blood stock', point: 'e-RaktKosh / blood-bank dashboards' },
  { icon: 'shieldCheck', title: 'Verification', point: 'ABDM facility registry · DigiLocker Aadhaar' },
  { icon: 'message', title: 'Real WhatsApp + SMS', point: 'WhatsApp Business API · SMS fallback for low data' },
];

function WorkflowTab() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Title eyebrow="Ideation">Problem → Insight → Solution</Title>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: 'Problem', img: IMAGES.ambulance, pts: ['Panic, no time to type', 'English-only apps', 'Nobody knows nearest blood / hospital'] },
            { t: 'Insight', img: IMAGES.heroDoctor, pts: ['Talking is the fastest interface', 'Indians speak mixed languages (Hinglish)', 'Agent must act, not just answer'] },
            { t: 'Solution', img: IMAGES.hospital, pts: ['Say one sentence', 'Agent finds & alerts help', 'Guides you by voice until help arrives'] },
          ].map((c) => (
            <div key={c.t} className="overflow-hidden rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent-soft to-white">
              <Photo src={c.img} label={c.t} className="h-32 rounded-none" />
              <div className="p-4">
                <Bullets items={c.pts} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Title eyebrow="System workflow">One sentence → help on the way</Title>
        <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
          <span className="rounded-full bg-primary px-3 py-1 text-white">Gnani AI</span>
          <span className="rounded-full bg-accent px-3 py-1 text-on-accent">HelpMe agent</span>
          <span className="rounded-full bg-sos-soft px-3 py-1 text-sos">Emergency / blood</span>
          <span className="rounded-full bg-[#d9fdd3] px-3 py-1 text-[#128c4a]">WhatsApp (demo)</span>
        </div>
        <MermaidFlow />
      </section>

      <section className="space-y-3">
        <Title eyebrow="Gnani AI usage">Where Gnani powers HelpMe</Title>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GNANI_USES.map((g) => (
            <div key={g.title} className="rounded-2xl bg-primary p-4 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary-dark">
                <Icon name={g.icon} size={18} />
              </span>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold">{g.title}</p>
              <div className="mt-1.5">
                <Bullets items={g.points} dark />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-4 py-2.5 font-semibold">API</th>
                <th className="px-4 py-2.5 font-semibold">Model · settings</th>
                <th className="px-4 py-2.5 font-semibold">Used for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">POST /stt/v3</td>
                <td className="px-4 py-2.5">prisma-v3.0 · hi-IN,en-IN · keyterms</td>
                <td className="px-4 py-2.5">Every spoken request</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">POST /api/v1/tts/inference</td>
                <td className="px-4 py-2.5">timbre-v2.5 · Nalini / Devika / Poorvi · WAV</td>
                <td className="px-4 py-2.5">Every reply + first aid</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">X-API-Key-ID</td>
                <td className="px-4 py-2.5">Node proxy only</td>
                <td className="px-4 py-2.5">Key never reaches browser</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <Title eyebrow="Future scope">What comes next</Title>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE.map((f) => (
            <div key={f.title} className={cn('flex gap-3 rounded-2xl border-2 p-4', f.tag ? 'border-sos/40 bg-sos-soft/40' : 'border-border bg-surface')}>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', f.tag ? 'bg-sos text-white' : 'bg-accent-soft text-primary')}>
                <Icon name={f.icon} size={18} />
              </span>
              <span>
                <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-semibold">
                  {f.title}
                  {f.tag && <span className="rounded-full bg-sos px-2 py-0.5 text-[10.5px] font-bold text-white">{f.tag}</span>}
                </span>
                <span className="text-[13px] leading-snug text-text-secondary">{f.point}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- FULL DETAILS ---------------- */

const STATS: { n: string; l: string; src: string }[] = [
  { n: '1,72,890', l: 'road-crash deaths in 2023 · ~474 / day', src: 'MoRTH 2023' },
  { n: '~50,000', l: 'deaths / year preventable with timely treatment', src: 'AIIMS-led committee (MoRTH, 2026)' },
  { n: '20.6%', l: 'patients reached hospital in the golden hour', src: 'Cureus 2025 study' },
  { n: '14.6 M', l: 'blood units India needs every year', src: 'Govt. in Parliament, 2025' },
  { n: '46%', l: 'of population in states called a “blood desert”', src: '2024 study (IndiaSpend)' },
  { n: '~10.6%', l: 'of Indians speak English', src: 'Census 2011' },
];

const SOURCES = [
  ['MoRTH Road Accidents in India 2023 (CAG)', 'https://www.cag.org.in/blogs/black-spots-safe-systems'],
  ['50K road deaths preventable (Tribune)', 'https://newswav.com/article/delhi-timely-treatment-could-prevent-50k-road-deaths-says-nitin-gadkari-A2606_Y3Q8mf'],
  ['Golden hour study — Cureus 2025', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11896012/'],
  ['Blood requirement & collection (ORF)', 'https://www.orfonline.org/index.php/expert-speak/securing-india-s-lifeblood-for-a-reliable-national-blood-supply'],
  ['Blood deserts (IndiaSpend / Newslaundry)', 'https://www.newslaundry.com/2026/03/02/govt-claims-it-is-blood-sufficient-but-is-it'],
  ['Multilingualism in India — Census 2011', 'https://en.wikipedia.org/wiki/Multilingualism_in_India'],
];

const CRITERIA: { k: string; v: string[] }[] = [
  { k: 'Gnani usage', v: ['Prisma STT + Timbre TTS in every voice flow', 'Hinglish code-mix, 3 voices, server-side keys'] },
  { k: 'Real-world impact', v: ['Golden-hour emergencies, blood, ambulance', 'Built for non-English, low-literacy users'] },
  { k: 'Working product', v: ['Real OSM hospitals / pharmacies / blood banks', 'Agent acts instantly + spoken first aid'] },
  { k: 'Innovation', v: ['Voice-first agent with live WhatsApp flow', 'Voice on every page, hand-off to agent'] },
];

function DetailsTab() {
  return (
    <div className="space-y-8">
      <div className="grid h-36 grid-cols-3 gap-3">
        <Photo src={IMAGES.ambulance} label="Ambulance" />
        <Photo src={IMAGES.blood} label="Blood" />
        <Photo src={IMAGES.hospital} label="Hospitals" />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <Title eyebrow="Why I started">From BloodNearby to HelpMe</Title>
          <Bullets
            items={[
              'Started as BloodNearby (BNB): voice agent to find blood donors',
              'Saw the bigger gap: families lose minutes calling around in emergencies',
              'Most help apps are English, text-heavy and slow under panic',
              'Goal: any Indian, any language, one sentence → help moving',
            ]}
          />
        </div>
        <div className="space-y-3">
          <Title eyebrow="The problem in numbers">Every minute counts</Title>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.n} className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent-soft to-white p-3">
                <p className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-none text-primary">{s.n}</p>
                <p className="mt-1.5 text-[12.5px] leading-snug">{s.l}</p>
                <p className="mt-1 text-[10.5px] text-text-secondary">{s.src}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Title eyebrow="Who it helps">Built for the under-served</Title>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: 'Can’t read or type', d: 'Everything by voice, replies spoken', img: IMAGES.heroDoctor },
            { t: 'Non-English speakers', d: 'Hindi, Hinglish + Indic languages', img: IMAGES.pharmacy },
            { t: 'Rural families', d: 'Search widens 5 → 15 → 30 km', img: IMAGES.ambulance },
            { t: 'Blood-seeking families', d: 'Compatible donors alerted, no forward chaos', img: IMAGES.blood },
            { t: 'Accident & pregnancy', d: 'Ambulance first, first aid by voice', img: IMAGES.hospital },
            { t: 'Elderly & bystanders', d: 'One sentence; agent asks only what’s missing', img: IMAGES.doctorMale },
          ].map((c) => (
            <div key={c.t} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2.5">
              <Photo src={c.img} className="h-16 w-16 shrink-0 rounded-xl" />
              <span>
                <span className="block font-semibold">{c.t}</span>
                <span className="text-[12.5px] text-text-secondary">{c.d}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <Title eyebrow="Impact">Faster · Inclusive · Scalable</Title>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Faster', ['Panic → nearest help in one sentence', 'Agent acts before asking more']],
            ['Inclusive', ['~90% of Indians don’t speak English', 'Voice-first for low literacy']],
            ['Scalable', ['Open map data + voice APIs', 'Phone-call channel next (Bolna.ai)']],
          ].map(([t, pts]) => (
            <div key={t as string} className="rounded-2xl bg-primary p-4">
              <p className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-accent">{t as string}</p>
              <div className="mt-1.5">
                <Bullets items={pts as string[]} dark />
              </div>
            </div>
          ))}
        </div>
        <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-[13px]">
          <b>Illustration:</b> closing just 1% of the ~50,000 preventable road deaths ≈ <b>500 lives / year</b>.
        </p>
      </section>

      <section className="space-y-3">
        <Title eyebrow="For judges">Evaluation at a glance</Title>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CRITERIA.map((c) => (
            <div key={c.k} className="rounded-2xl border-2 border-primary/20 bg-surface p-4">
              <p className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-semibold">
                <Icon name="checkCircle" size={16} className="text-success" /> {c.k}
              </p>
              <div className="mt-1.5">
                <Bullets items={c.v} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
            <p className="font-semibold text-success">Real</p>
            <Bullets items={['Gnani Prisma STT + Timbre TTS', 'OpenStreetMap places + routes', 'Agent logic + first aid']} />
          </div>
          <div className="rounded-2xl border border-border bg-surface-low p-4">
            <p className="font-semibold text-text-secondary">Demo / simulated (labelled)</p>
            <Bullets items={['Donors, ambulance GPS', 'WhatsApp messages, OTP, Aadhaar check']} />
          </div>
        </div>
      </section>

      <section>
        <p className="eyebrow">Sources</p>
        <ul className="mt-2 grid gap-1 text-[12.5px] sm:grid-cols-2">
          {SOURCES.map(([t, u]) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer" className="text-primary underline decoration-accent underline-offset-2 hover:text-accent-dark">
                {t}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- MODAL ---------------- */

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'video', label: 'Video', icon: 'activity' },
  { id: 'workflow', label: 'Workflow & ideation', icon: 'layers3' },
  { id: 'details', label: 'Full details', icon: 'listChecks' },
];

export function EvaluationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('video');

  useEffect(() => {
    if (!open) return;
    void loadMermaid().catch(() => undefined); // warm up the diagram
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(18,30,22,0.6)] p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Evaluation"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border-2 border-primary bg-bg shadow-[var(--shadow-float)]"
          >
            <div className="flex items-center gap-3 border-b border-border bg-surface p-3 sm:p-4">
              <div className="grid flex-1 grid-cols-3 gap-2 sm:gap-3">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 text-[13px] font-semibold transition-colors sm:text-[15px]',
                      tab === t.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text hover:border-accent',
                    )}
                  >
                    <Icon name={t.icon} size={16} className={tab === t.id ? 'text-accent' : 'text-primary'} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border hover:border-sos hover:text-sos">
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
              {tab === 'video' && <VideoTab />}
              {tab === 'workflow' && <WorkflowTab />}
              {tab === 'details' && <DetailsTab />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
