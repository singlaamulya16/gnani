import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';
import { delay } from '@/lib/geo';
import {
  agentStep,
  conditionLabel,
  GREETING,
  initialAgentState,
  isCritical,
  type AgentState,
  type AgentTask,
} from '@/services/agent/agentEngine';
import { ambulanceService } from '@/services/ambulanceService';
import { donorService, type DonorMatch } from '@/services/donorService';
import { placesService } from '@/services/placesService';
import { requestService } from '@/services/requestService';
import { voiceService } from '@/services/voice/voiceService';
import { useAppStore } from '@/store/appStore';
import type { BloodGroup, Place, SampleRequest } from '@/types/domain';

type Msg = { id: number; from: 'agent' | 'user'; text: string };
type StepStatus = 'pending' | 'running' | 'done';
type Step = { label: string; status: StepStatus; detail?: string };
type Mic = 'idle' | 'listening' | 'thinking' | 'speaking';

const TASK_META: Record<AgentTask, { title: string; icon: IconName; urgent?: boolean }> = {
  blood: { title: 'Blood request', icon: 'droplet', urgent: true },
  ambulance: { title: 'Ambulance dispatch', icon: 'ambulance', urgent: true },
  hospital: { title: 'Nearest hospital', icon: 'hospital' },
  doctor: { title: 'Find a doctor', icon: 'stethoscope' },
  pharmacy: { title: 'Find medicine', icon: 'pill' },
};

const START_TILES: { text: string; label: string; icon: IconName; urgent?: boolean }[] = [
  { text: 'I need blood', label: 'Need blood', icon: 'droplet', urgent: true },
  { text: 'Ambulance chahiye', label: 'Ambulance', icon: 'ambulance', urgent: true },
  { text: 'Nearest hospital', label: 'Hospital', icon: 'hospital' },
  { text: 'Doctor chahiye', label: 'Doctor', icon: 'stethoscope' },
  { text: 'Medicine chahiye', label: 'Medicine', icon: 'pill' },
];

export const gmapsUrl = (p: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

let msgId = 0;

export function AgentPage() {
  const { i18n } = useTranslation();
  const reduce = useReducedMotion();
  const coords = useAppStore((s) => s.coords);
  const locationLabel = useAppStore((s) => s.locationLabel);

  const [agent, setAgent] = useState<AgentState>(() => initialAgentState(i18n.language));
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [quick, setQuick] = useState<string[]>(START_TILES.map((s) => s.text).slice(0, 3));
  const [mic, setMic] = useState<Mic>('idle');
  const [handsFree, setHandsFree] = useState(true);
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const [typed, setTyped] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [results, setResults] = useState<Place[]>([]);
  const [donors, setDonors] = useState<DonorMatch[]>([]);
  const [request, setRequest] = useState<SampleRequest | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const alive = useRef(true);
  const chatEnd = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const say = useCallback(async (text: string, lang: string) => {
    setMessages((m) => [...m, { id: ++msgId, from: 'agent', text }]);
    setMic('speaking');
    await voiceService.speak(text, lang);
    if (alive.current) setMic('idle');
  }, []);

  /* ---------------- task execution (left side) ---------------- */

  const runStep = async (i: number, fn: () => Promise<string | undefined>) => {
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, status: 'running' } : x)));
    await delay(500);
    const detail = await fn();
    setSteps((s) => s.map((x, j) => (j === i ? { ...x, status: 'done', detail } : x)));
  };

  const execute = useCallback(
    async (st: AgentState): Promise<string> => {
      const { task, slots, lang } = st;
      const hi = lang === 'hi';
      const he = lang === 'hi-en';
      setResults([]);
      setDonors([]);
      setRequest(null);
      setEta(null);

      if (task === 'blood') {
        setSteps([
          { label: 'Confirming your location', status: 'pending' },
          { label: 'Searching blood banks near you', status: 'pending' },
          { label: `Matching ${slots.group} donors nearby`, status: 'pending' },
          { label: 'Creating the blood request', status: 'pending' },
          { label: 'Alerting donors on Telegram (demo)', status: 'pending' },
        ]);
        await runStep(0, async () => locationLabel);
        let banks: Place[] = [];
        await runStep(1, async () => {
          const r = await placesService.searchWithMeta({ near: coords, kind: 'blood_bank' });
          banks = r.places.slice(0, 4);
          setResults(banks);
          return `${banks.length} found`;
        });
        let matched: DonorMatch[] = [];
        await runStep(2, async () => {
          matched = (await donorService.listNearby(coords, slots.group as BloodGroup)).slice(0, 4);
          setDonors(matched);
          return `${matched.length} available (demo donor${matched.length === 1 ? '' : 's'})`;
        });
        let req: SampleRequest | null = null;
        await runStep(3, async () => {
          req = await requestService.createBloodRequest({ bloodGroup: slots.group as BloodGroup, units: slots.units ?? 1 });
          setRequest(req);
          return `#${req.id.slice(-6).toUpperCase()}`;
        });
        await runStep(4, async () => `${matched.length} donor${matched.length === 1 ? '' : 's'} notified`);
        if (req) requestService.simulateBloodProgress((req as SampleRequest).id, (r) => alive.current && setRequest(r));
        const nearest = banks[0];
        if (hi) return `हो गया। ${banks.length} ब्लड बैंक मिले${nearest ? `, सबसे पास ${nearest.name}, ${nearest.distanceKm} किलोमीटर` : ''}। ${matched.length} डोनर्स को अलर्ट भेज दिया है। कुछ और मदद चाहिए?`;
        if (he) return `Ho gaya. ${banks.length} blood banks mile${nearest ? `, sabse paas ${nearest.name}, ${nearest.distanceKm} kilometer` : ''}. ${matched.length} donor${matched.length === 1 ? '' : 's'} ko alert bhej diya hai. Kuch aur madad chahiye?`;
        return `Done. I found ${banks.length} blood banks${nearest ? `; the nearest is ${nearest.name}, ${nearest.distanceKm} km away` : ''}. ${matched.length} matching donor${matched.length === 1 ? ' has' : 's have'} been alerted. Anything else?`;
      }

      if (task === 'ambulance') {
        setSteps([
          { label: 'Sharing your live location', status: 'pending' },
          { label: 'Finding the nearest ambulance', status: 'pending' },
          { label: 'Alerting the nearest emergency hospital', status: 'pending' },
          { label: 'Notifying your emergency contact (demo)', status: 'pending' },
        ]);
        await runStep(0, async () => locationLabel);
        let minutes = 0;
        await runStep(1, async () => {
          const r = await ambulanceService.requestNearest(coords);
          minutes = Math.max(3, Math.round(r.route.durationMin));
          setEta(minutes);
          return `ETA ~${minutes} min${r.demo ? ' (simulated)' : ''}`;
        });
        let hospitals: Place[] = [];
        await runStep(2, async () => {
          const r = await placesService.searchWithMeta({ near: coords, kind: 'hospital' });
          hospitals = r.places.slice(0, 4);
          setResults(hospitals);
          return hospitals[0] ? `${hospitals[0].name} · ${hospitals[0].distanceKm} km` : 'No hospital data';
        });
        await runStep(3, async () => 'SMS + Telegram sent');
        const h = hospitals[0];
        if (hi) return `एम्बुलेंस बुला ली है, लगभग ${minutes} मिनट में पहुँचेगी।${h ? ` सबसे पास का अस्पताल ${h.name} है।` : ''} मरीज़ के साथ रहिए।`;
        if (he) return `Ambulance request ho gayi hai, lagbhag ${minutes} minute mein pahunchegi.${h ? ` Sabse paas ka hospital ${h.name} hai.` : ''} Patient ke saath rahiye.`;
        return `Ambulance requested. It should reach in about ${minutes} minutes.${h ? ` The nearest hospital is ${h.name}.` : ''} Stay with the patient.`;
      }

      const kindMap = { hospital: 'hospital', doctor: ['doctor', 'clinic'], pharmacy: 'pharmacy' } as const;
      const label =
        task === 'hospital' ? 'hospitals' : task === 'doctor' ? `${slots.specialty ?? ''} doctors & clinics` : 'pharmacies';
      setSteps([
        { label: 'Confirming your location', status: 'pending' },
        { label: `Searching ${label} near you`, status: 'pending' },
        { label: 'Ranking by distance and opening hours', status: 'pending' },
      ]);
      await runStep(0, async () => locationLabel);
      let found: Place[] = [];
      await runStep(1, async () => {
        const r = await placesService.searchWithMeta({
          near: coords,
          kind: kindMap[task as 'hospital' | 'doctor' | 'pharmacy'] as never,
        });
        found = r.places.slice(0, 5);
        return `${r.places.length} found`;
      });
      await runStep(2, async () => {
        setResults(found);
        return found[0] ? `Nearest: ${found[0].name}` : 'Nothing nearby';
      });
      const n = found[0];
      if (!n) return hi ? 'माफ़ कीजिए, पास में कुछ नहीं मिला। 112 पर कॉल करें।' : he ? 'Sorry, paas mein kuch nahi mila. 112 call karein.' : 'Sorry, I could not find anything nearby. Please call 112.';
      const extra = task === 'pharmacy' ? (hi ? ` ${slots.medicine} के लिए पहले कॉल करके पूछ लें।` : he ? ` ${slots.medicine} ke liye pehle call karke pooch lein.` : ` Call ahead to check ${slots.medicine} stock.`) : '';
      if (hi) return `सबसे पास ${n.name} है, ${n.distanceKm} किलोमीटर दूर। बाईं तरफ़ Google Maps से रास्ता खोलें।${extra}`;
      if (he) return `Sabse paas ${n.name} hai, ${n.distanceKm} kilometer door. Left side se Google Maps mein route kholiye.${extra}`;
      return `The nearest is ${n.name}, ${n.distanceKm} km away. Open the route in Google Maps on the left.${extra}`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coords, locationLabel],
  );

  /* ---------------- conversation loop (right side) ---------------- */

  const listenRef = useRef<() => Promise<void>>(async () => {});

  const handleUser = useCallback(
    async (text: string) => {
      if (!text.trim() || busy.current) return;
      busy.current = true;
      setMessages((m) => [...m, { id: ++msgId, from: 'user', text }]);
      setMic('thinking');
      const turn = agentStep(agentRef.current, text, i18n.language);
      setAgent(turn.state);
      setQuick(turn.quick);
      await say(turn.reply, turn.state.lang);
      if (turn.execute) {
        const summary = await execute(turn.state);
        if (!alive.current) return;
        setAgent((a) => ({ ...a, stage: 'done' }));
        setQuick(['Ambulance bulao', 'Nearest hospital', 'Medicine chahiye']);
        await say(summary, turn.state.lang);
      }
      busy.current = false;
      if (alive.current && handsFreeRef.current) void listenRef.current();
    },
    [execute, i18n.language, say],
  );

  const listen = useCallback(async () => {
    if (busy.current || voiceService.isListening()) return;
    try {
      setMic('listening');
      const text = await voiceService.startListening(agentRef.current.lang === 'en' ? 'en' : 'hi');
      if (!alive.current) return;
      await handleUser(text);
    } catch {
      if (alive.current) setMic('idle');
    }
  }, [handleUser]);
  listenRef.current = listen;

  // Greet once, then start listening (hands-free)
  const greeted = useRef(false);
  useEffect(() => {
    alive.current = true;
    if (greeted.current) return () => {
      alive.current = false;
      voiceService.stopListening();
    };
    greeted.current = true;
    const lang = agentRef.current.lang;
    void (async () => {
      await say(GREETING[lang], lang);
      if (alive.current && handsFreeRef.current) void listenRef.current();
    })();
    return () => {
      alive.current = false;
      voiceService.stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    if (voiceService.isListening()) {
      voiceService.stopListening();
      return;
    }
    void listen();
  };

  const send = (text: string) => {
    if (voiceService.isListening()) voiceService.stopListening();
    void handleUser(text);
  };

  const meta = agent.task ? TASK_META[agent.task] : null;
  const s = agent.slots;
  const fields: { label: string; value?: string }[] =
    agent.task === 'blood'
      ? [
          { label: 'Blood group', value: s.group },
          { label: 'Units', value: s.units ? String(s.units) : undefined },
          { label: 'Hospital', value: s.hospital },
          { label: 'Your location', value: locationLabel },
        ]
      : agent.task === 'ambulance'
        ? [
            { label: 'Emergency', value: s.condition ? conditionLabel(s.condition, 'en') : undefined },
            { label: 'Patient conscious', value: s.conscious ? (s.conscious === 'yes' ? 'Yes' : 'No') : undefined },
            { label: 'Pickup location', value: locationLabel },
          ]
        : agent.task === 'doctor'
          ? [
              { label: 'Specialty', value: s.specialty },
              { label: 'Near', value: locationLabel },
            ]
          : agent.task === 'pharmacy'
            ? [
                { label: 'Medicine', value: s.medicine },
                { label: 'Near', value: locationLabel },
              ]
            : agent.task === 'hospital'
              ? [{ label: 'Near', value: locationLabel }]
              : [];

  const critical = agent.task === 'ambulance' && isCritical(s);

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[1.2fr_1fr] lg:px-8">
      {/* ================= LEFT: agent workspace ================= */}
      <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-[28px] border border-border bg-surface p-5 shadow-[var(--shadow-card)] lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-sos px-3 py-1 text-[12px] font-bold text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              SOS AGENT · LIVE
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight">
              {meta ? (
                <>
                  <span className="text-highlight">{meta.title.split(' ')[0]}</span> {meta.title.split(' ').slice(1).join(' ')}
                </>
              ) : (
                <>
                  How can I <span className="text-highlight">help?</span>
                </>
              )}
            </h1>
            <p className="mt-1 text-[13.5px] text-text-secondary">
              {agent.stage === 'intro' && 'Speak or tap. I will ask only what is needed and do the rest.'}
              {agent.stage === 'collect' && 'Collecting details…'}
              {agent.stage === 'confirm' && 'Waiting for your confirmation'}
              {agent.stage === 'execute' && 'Working on it…'}
              {agent.stage === 'done' && 'Done. I will keep tracking the status below.'}
            </p>
          </div>
          <a
            href="tel:112"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-sos px-4 text-[14px] font-bold text-white shadow-[var(--shadow-sos)]"
          >
            <Icon name="phone" size={16} /> 112
          </a>
        </div>

        {critical && (
          <a
            href="tel:108"
            className="flex items-center justify-between gap-3 rounded-2xl bg-sos p-4 text-white shadow-[var(--shadow-sos)]"
          >
            <span>
              <span className="block font-[family-name:var(--font-display)] text-[17px] font-semibold">Critical — call 108 now</span>
              <span className="text-[13px] text-white/85">Keep the patient still, check breathing, stay on the line.</span>
            </span>
            <Icon name="phone" size={22} />
          </a>
        )}

        {/* Start tiles */}
        {!agent.task && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {START_TILES.map((tile) => (
              <button
                key={tile.label}
                type="button"
                onClick={() => send(tile.text)}
                className={cn(
                  'flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5',
                  tile.urgent ? 'border-sos/30 bg-sos-soft/60' : 'border-accent/40 bg-accent-soft/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full',
                    tile.urgent ? 'bg-sos text-white' : 'bg-primary text-accent',
                  )}
                >
                  <Icon name={tile.icon} size={20} />
                </span>
                <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">{tile.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Collected details */}
        {meta && (
          <div className="rounded-2xl border border-border bg-bg p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', meta.urgent ? 'bg-sos text-white' : 'bg-primary text-accent')}>
                <Icon name={meta.icon} size={17} />
              </span>
              <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {fields.map((f) => (
                <motion.div
                  key={f.label}
                  layout
                  className={cn(
                    'rounded-xl border px-3 py-2.5 transition-colors',
                    f.value ? 'border-accent/50 bg-accent-soft' : 'border-dashed border-border bg-surface',
                  )}
                >
                  <span className="block text-[11.5px] font-medium uppercase tracking-wide text-text-secondary">{f.label}</span>
                  <span className={cn('mt-0.5 flex items-center gap-1.5 text-[15px] font-semibold', f.value ? 'text-text' : 'text-text-secondary/70')}>
                    {f.value ? <Icon name="checkCircle" size={15} className="text-success" /> : null}
                    {f.value ?? 'Waiting…'}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {steps.length > 0 && (
          <div className="rounded-2xl border border-border p-4">
            <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Agent actions</span>
            <ol className="mt-3 space-y-2.5">
              {steps.map((st, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                      st.status === 'done' && 'bg-success text-white',
                      st.status === 'running' && 'bg-accent text-on-accent',
                      st.status === 'pending' && 'bg-surface-mid text-text-secondary',
                    )}
                  >
                    {st.status === 'done' ? <Icon name="check" size={13} strokeWidth={3} /> : st.status === 'running' ? (
                      <motion.span className="h-2.5 w-2.5 rounded-full border-2 border-on-accent border-t-transparent" animate={reduce ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
                    ) : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-[14px] font-medium', st.status === 'pending' ? 'text-text-secondary' : 'text-text')}>{st.label}</span>
                    {st.detail && <span className="text-[12.5px] text-text-secondary">{st.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Live status */}
        {(request || eta) && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary p-4 text-white">
            <span>
              <span className="block text-[12px] font-semibold uppercase tracking-wide text-accent">Live status</span>
              <span className="font-[family-name:var(--font-display)] text-[18px] font-semibold">
                {request ? request.status : `Ambulance on the way · ~${eta} min`}
              </span>
            </span>
            {request && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
                #{request.id.slice(-6).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2.5">
            <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Nearest options</span>
            {results.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                  <Icon name={p.kind === 'pharmacy' ? 'pill' : p.kind === 'blood_bank' ? 'droplet' : p.kind === 'hospital' ? 'hospital' : 'stethoscope'} size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-text-secondary">
                    {p.distanceKm} km · {p.address || 'Address not listed'}
                  </span>
                </span>
                {p.phone && (
                  <a href={`tel:${p.phone.split(/[;,]/)[0]!.replace(/\s/g, '')}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white" aria-label={`Call ${p.name}`}>
                    <Icon name="phone" size={16} />
                  </a>
                )}
                <a
                  href={gmapsUrl(p)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
                >
                  <Icon name="navigation" size={15} /> Maps
                </a>
              </div>
            ))}
          </div>
        )}

        {donors.length > 0 && (
          <div className="space-y-2">
            <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Matched donors <span className="text-[12px] font-normal text-text-secondary">(demo data)</span></span>
            <div className="grid grid-cols-2 gap-2.5">
              {donors.map((d) => (
                <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sos-soft text-[12px] font-bold text-sos">{d.bloodGroup}</span>
                  <span>
                    <span className="block text-[14px] font-semibold">{d.firstName}</span>
                    <span className="text-[12px] text-text-secondary">{d.distanceKm.toFixed(1)} km · notified</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ================= RIGHT: voice chat ================= */}
      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[28px] bg-primary shadow-[var(--shadow-voice)] lg:min-h-0">
        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary-dark">
              <Icon name="heartPulse" size={20} strokeWidth={2.25} />
            </span>
            <span>
              <span className="block font-[family-name:var(--font-display)] text-[17px] font-semibold text-white">HelpMe Agent</span>
              <span className="text-[12px] text-accent">Gnani AI voice · Prisma + Timbre</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHandsFree((h) => !h)}
            className={cn('rounded-full px-3 py-1.5 text-[12px] font-semibold', handsFree ? 'bg-accent text-on-accent' : 'bg-white/10 text-white/80')}
          >
            {handsFree ? 'Hands-free ON' : 'Hands-free OFF'}
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-bg/95 px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}
              >
                <span
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed',
                    m.from === 'user' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-border bg-surface text-text shadow-[var(--shadow-card)]',
                  )}
                >
                  {m.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {mic === 'thinking' && (
            <div className="flex gap-1 px-2">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-2 w-2 rounded-full bg-primary/50" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
              ))}
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        <div className="space-y-3 bg-bg/95 px-4 pb-4">
          {quick.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-accent/50 bg-accent-soft px-3.5 py-1.5 text-[13px] font-semibold text-on-accent hover:bg-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1.5 shadow-[var(--shadow-card)]">
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Talk"
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                mic === 'listening' ? 'bg-sos text-white' : 'bg-primary text-accent',
              )}
            >
              {mic === 'listening' && !reduce && (
                <motion.span className="absolute inset-0 rounded-full bg-sos/40" animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 1 }} />
              )}
              <Icon name="mic" size={19} />
            </button>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typed.trim()) {
                  send(typed.trim());
                  setTyped('');
                }
              }}
              placeholder={mic === 'listening' ? 'Listening… speak now' : mic === 'speaking' ? 'Agent is speaking…' : 'Type or tap the mic'}
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[14.5px] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!typed.trim()) return;
                send(typed.trim());
                setTyped('');
              }}
              className="flex h-11 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-on-accent"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
