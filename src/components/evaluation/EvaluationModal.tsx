import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Paste your YouTube demo link here (or in the Video tab — it is remembered in this browser). */
export const DEMO_VIDEO_URL = '';

type Tab = 'video' | 'workflow' | 'details';

function toEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/* ------------------------------------------------------------------ */
/* VIDEO                                                               */
/* ------------------------------------------------------------------ */
function VideoTab() {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem('helpme-demo-video') || DEMO_VIDEO_URL;
    } catch {
      return DEMO_VIDEO_URL;
    }
  });
  const [draft, setDraft] = useState(url);
  const embed = toEmbed(url);

  return (
    <div className="space-y-4">
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
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-primary text-center text-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary-dark">
            <Icon name="activity" size={28} />
          </span>
          <p className="font-[family-name:var(--font-display)] text-[22px] font-semibold">Demo video coming here</p>
          <p className="max-w-md text-[14px] text-white/75">Paste the YouTube link below (or set DEMO_VIDEO_URL in EvaluationModal.tsx).</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://youtu.be/…"
          className="h-11 min-w-0 flex-1 rounded-full border-2 border-border bg-surface px-4 text-[14px] outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            setUrl(draft.trim());
            try {
              localStorage.setItem('helpme-demo-video', draft.trim());
            } catch {
              /* ignore */
            }
          }}
          className="h-11 rounded-full bg-primary px-5 text-[14px] font-semibold text-white"
        >
          Save link
        </button>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-sos px-5 text-[14px] font-semibold text-white">
            Open on YouTube
          </a>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['0:00', 'Hinglish voice SOS → agent acts instantly'],
          ['0:30', 'Blood request → donors → WhatsApp accept + live location'],
          ['1:00', 'Page voice + live map of real hospitals'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-border bg-surface p-3">
            <span className="text-[12px] font-bold text-accent-dark">{t}</span>
            <p className="text-[13.5px] font-medium">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WORKFLOW                                                            */
/* ------------------------------------------------------------------ */
const PIPELINE: { icon: IconName; title: string; body: string; gnani?: boolean }[] = [
  { icon: 'userRound', title: '1 · User speaks', body: 'Any language: Hindi, English, Hinglish, Tamil… No typing, no reading needed.' },
  { icon: 'mic', title: '2 · Browser records', body: 'Mic → 16 kHz mono WAV, auto-stops on silence. Tap again to stop early.' },
  { icon: 'shieldCheck', title: '3 · HelpMe server proxy', body: 'POST /api/voice/stt — the Gnani API key never reaches the browser.' },
  { icon: 'languages', title: '4 · Gnani Prisma v3.0 (STT)', body: 'language_code "hi-IN,en-IN" for code-mixed Hinglish + medical keyterms → transcript + detected language.', gnani: true },
  { icon: 'activity', title: '5 · HelpMe agent brain', body: 'Detects 13 emergency types, fills slots (blood group, units…), acts immediately, gives first aid, ignores off-topic.' },
  { icon: 'map', title: '6 · Actions', body: 'Real OpenStreetMap hospitals/blood banks, compatible donors, ambulance dispatch, WhatsApp alerts, routes.' },
  { icon: 'message', title: '7 · Gnani Timbre v2.5 (TTS)', body: 'Reply spoken in the user’s language: Nalini (Hindi), Devika (English), Poorvi (Hinglish).', gnani: true },
  { icon: 'heartPulse', title: '8 · Help arrives', body: 'Spoken first-aid steps until help reaches, live status and start code on WhatsApp.' },
];

const GNANI_USES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'siren', title: 'SOS Agent (hands-free loop)', body: 'Prisma listens → agent acts → Timbre speaks → listens again, so a panicking user never has to touch the screen.' },
  { icon: 'mic', title: 'Voice on every page', body: 'Hospitals, Blood, Ambulance, Doctors, Pharmacy, Map each understand spoken requests and act on that page.' },
  { icon: 'languages', title: 'Hinglish & code-mixing', body: 'Prisma multi-language codes handle “mujhe B positive blood chahiye”; Timbre’s hi-en voice answers naturally.' },
  { icon: 'shieldAlert', title: 'Spoken first aid', body: 'Head injury, labour, burns, snake bite… steps are read aloud in the caller’s language by Timbre.' },
  { icon: 'globe', title: 'Language switching by voice', body: '“Hindi mein bolo” switches the whole app; replies follow the language the user speaks.' },
  { icon: 'check', title: 'Key test script', body: 'server/scripts/test-gnani.mjs: Timbre speaks a line, Prisma transcribes it back — proves both APIs end-to-end.' },
];

const FUTURE: { icon: IconName; title: string; body: string; tag?: string }[] = [
  { icon: 'phone', title: 'Live phone-call agent', body: 'Call a toll-free number from any feature phone and talk to the same agent. Planned with Bolna.ai voice-call agents, using Gnani for Indic speech.', tag: 'Next' },
  { icon: 'activity', title: 'Streaming voice', body: 'Gnani Prisma WebSocket + Timbre SSE streaming for sub-second, interruptible conversations.' },
  { icon: 'ambulance', title: 'Real 108 / 102 dispatch', body: 'Integrate state ambulance operators and live GPS of vehicles instead of simulated tracking.' },
  { icon: 'droplet', title: 'Live blood stock', body: 'e-RaktKosh / blood-bank dashboards for real unit availability by group.' },
  { icon: 'shieldCheck', title: 'Verified facilities & donors', body: 'ABDM Health Facility Registry, DigiLocker Aadhaar verification, hospital self-registration.' },
  { icon: 'message', title: 'Real WhatsApp & SMS', body: 'WhatsApp Business API + SMS fallback for areas with poor data.' },
  { icon: 'languages', title: 'All 10 Indic languages', body: 'Timbre v3.0 voices speak all 10 languages; regional UI text next.' },
  { icon: 'activity', title: 'Evon reasoning', body: 'Gnani’s Evon LLM for smarter triage once available on the API platform.' },
];

function WorkflowTab() {
  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Ideation</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ['Problem', 'In an emergency people panic, can’t type, don’t speak English and don’t know where the nearest blood or hospital is.'],
            ['Insight', 'Talking is the fastest interface. Indians speak in their own language — often Hinglish — so the system must understand that.'],
            ['Solution', 'HelpMe: say one sentence, and an agent finds blood, ambulances, hospitals and doctors, then guides you by voice.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent-soft to-white p-4">
              <p className="font-[family-name:var(--font-display)] text-[17px] font-semibold">{t}</p>
              <p className="mt-1 text-[13.5px] text-text-secondary">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow">How a request flows</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                'relative rounded-2xl border-2 p-4',
                s.gnani ? 'border-primary bg-primary text-white shadow-[var(--shadow-voice)]' : 'border-border bg-surface',
              )}
            >
              {s.gnani && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-primary-dark">GNANI AI</span>
              )}
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', s.gnani ? 'bg-accent text-primary-dark' : 'bg-accent-soft text-primary')}>
                <Icon name={s.icon} size={18} />
              </span>
              <p className={cn('mt-2 font-[family-name:var(--font-display)] text-[15px] font-semibold', s.gnani ? 'text-white' : 'text-text')}>{s.title}</p>
              <p className={cn('mt-1 text-[12.5px] leading-snug', s.gnani ? 'text-white/80' : 'text-text-secondary')}>{s.body}</p>
              {i < PIPELINE.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-primary-dark lg:flex">
                  <Icon name="chevronRight" size={13} strokeWidth={3} />
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow">Where Gnani AI powers HelpMe</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GNANI_USES.map((g) => (
            <div key={g.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-accent">
                <Icon name={g.icon} size={18} />
              </span>
              <span>
                <span className="block font-[family-name:var(--font-display)] text-[15px] font-semibold">{g.title}</span>
                <span className="text-[13px] leading-snug text-text-secondary">{g.body}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Gnani API</th>
                <th className="px-4 py-2.5 font-semibold">Model / settings</th>
                <th className="px-4 py-2.5 font-semibold">Used for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">POST /stt/v3</td>
                <td className="px-4 py-2.5">prisma-v3.0 · hi-IN,en-IN · keyterms (blood, ambulance…)</td>
                <td className="px-4 py-2.5">Every spoken request (agent, pages, AI helper)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">POST /api/v1/tts/inference</td>
                <td className="px-4 py-2.5">timbre-v2.5 · Nalini / Devika / Poorvi (hi-en) · WAV</td>
                <td className="px-4 py-2.5">Every reply, confirmations and first-aid steps</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-[12px]">X-API-Key-ID</td>
                <td className="px-4 py-2.5">Server-side only (Node proxy)</td>
                <td className="px-4 py-2.5">Keeps keys safe; browser never sees them</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="eyebrow">Future scope</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                <span className="text-[13px] leading-snug text-text-secondary">{f.body}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FULL DETAILS                                                        */
/* ------------------------------------------------------------------ */
const STATS: { n: string; l: string; src: string }[] = [
  { n: '1,72,890', l: 'people died in road crashes in India in 2023 — about 474 every day', src: 'MoRTH, Road Accidents in India 2023' },
  { n: '~50,000', l: 'road-crash deaths a year could be prevented with timely treatment', src: 'AIIMS-led committee, cited by MoRTH (2026)' },
  { n: '20.6%', l: 'of road-accident patients reached a hospital within the golden hour in one study', src: 'Cureus 2025 (Gaikwad et al.)' },
  { n: '14.6 M', l: 'units of blood India needs every year', src: 'Government reply in Parliament, 2025' },
  { n: '46%', l: 'of India’s population lives in states described as an effective “blood desert”', src: '2024 study, reported by IndiaSpend' },
  { n: '~10.6%', l: 'of Indians speak English at all — most need help in their own language', src: 'Census 2011' },
];

const SOURCES = [
  ['MoRTH Road Accidents in India 2023 (via CAG / OpenCity)', 'https://www.cag.org.in/blogs/black-spots-safe-systems'],
  ['Timely treatment could prevent 50K road deaths (Tribune)', 'https://newswav.com/article/delhi-timely-treatment-could-prevent-50k-road-deaths-says-nitin-gadkari-A2606_Y3Q8mf'],
  ['"Golden Hour" in RTA victims — Cureus 2025', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11896012/'],
  ['India’s blood requirement and collection (ORF)', 'https://www.orfonline.org/index.php/expert-speak/securing-india-s-lifeblood-for-a-reliable-national-blood-supply'],
  ['Blood deserts (IndiaSpend / Newslaundry)', 'https://www.newslaundry.com/2026/03/02/govt-claims-it-is-blood-sufficient-but-is-it'],
  ['Multilingualism in India — Census 2011', 'https://en.wikipedia.org/wiki/Multilingualism_in_India'],
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="eyebrow">{title}</p>
      <div className="mt-2 space-y-2 text-[14.5px] leading-relaxed text-text">{children}</div>
    </section>
  );
}

function DetailsTab() {
  return (
    <div className="space-y-8">
      <Block title="Why I started">
        <p>
          HelpMe began as <b>BloodNearby (BNB)</b> — a voice agent to find blood donors fast. Building it showed me the real
          problem is bigger than blood: in an emergency, families lose precious minutes calling around, searching in English apps,
          and not knowing where the nearest hospital, ambulance or donor is.
        </p>
        <p>
          I wanted one place where anyone — in any language, without typing — can say what happened and get help moving
          immediately. Gnani AI’s Indic speech models made that possible.
        </p>
      </Block>

      <section>
        <p className="eyebrow">The problem in numbers</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent-soft to-white p-4">
              <p className="font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none text-primary">{s.n}</p>
              <p className="mt-2 text-[13.5px] leading-snug text-text">{s.l}</p>
              <p className="mt-2 text-[11.5px] text-text-secondary">Source: {s.src}</p>
            </div>
          ))}
        </div>
      </section>

      <Block title="Who it helps — especially the under-served">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            ['People who can’t read or type', 'Everything works by voice; replies are spoken, not just written.'],
            ['Non-English speakers', 'Hindi, Hinglish and Indian languages through Gnani Prisma and Timbre.'],
            ['Rural & small-town families', 'Search widens automatically (5 → 15 → 30 km) when help is far away.'],
            ['Elderly people & panicking bystanders', 'One sentence is enough — the agent asks only what is missing.'],
            ['Blood-seeking families', 'Compatible donors matched and alerted instead of WhatsApp-forward chaos.'],
            ['Pregnant women & accident victims', 'Ambulance dispatched first, spoken first aid while help is on the way.'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <Icon name="checkCircle" size={18} className="mt-0.5 shrink-0 text-success" />
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="text-[13px] text-text-secondary">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Impact">
        <p>
          Time is the difference between life and death. HelpMe attacks the first minutes: <b>understanding the emergency</b>,{' '}
          <b>finding the nearest real help</b> and <b>alerting the right people</b> — in seconds, in the caller’s language.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Faster', 'From panic to the nearest hospital and ambulance in one spoken sentence.'],
            ['Inclusive', 'Built for the ~90% of Indians who don’t speak English, including low-literacy users.'],
            ['Scalable', 'Open map data, voice APIs and a phone-call channel (next) can reach every district.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-primary p-4 text-white">
              <p className="font-[family-name:var(--font-display)] text-[18px] font-semibold text-accent">{t}</p>
              <p className="mt-1 text-[13.5px] text-white/85">{d}</p>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-text-secondary">
          Illustration: if timely help could prevent ~50,000 road deaths a year, every 1% of that gap HelpMe helps close is roughly
          500 lives a year.
        </p>
      </Block>

      <Block title="What is real vs demo">
        <p className="text-[13.5px]">
          <b>Real:</b> Gnani Prisma speech-to-text and Timbre text-to-speech, OpenStreetMap hospitals/pharmacies/blood banks, the
          agent logic and first-aid guidance. <b>Demo / simulated:</b> donors, ambulance GPS, WhatsApp messages, OTP and Aadhaar
          verification — clearly labelled in the app.
        </p>
      </Block>

      <section>
        <p className="eyebrow">Sources</p>
        <ul className="mt-2 space-y-1 text-[13px]">
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

/* ------------------------------------------------------------------ */

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'video', label: 'Video', icon: 'activity' },
  { id: 'workflow', label: 'Workflow & ideation', icon: 'layers3' },
  { id: 'details', label: 'Full details', icon: 'listChecks' },
];

export function EvaluationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('video');

  useEffect(() => {
    if (!open) return;
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
