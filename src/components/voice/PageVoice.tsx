import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { detectTask, findEmergency, nextLang, parseBloodGroup, parseUnits } from '@/services/agent/agentEngine';
import type { ReplyLang } from '@/services/voice/intent';
import { stopSpeaking, voiceService } from '@/services/voice/voiceService';
import { useAppStore } from '@/store/appStore';
import type { PlaceKind } from '@/types/domain';

export type VoicePage = 'hospital' | 'blood' | 'ambulance' | 'doctor' | 'pharmacy' | 'map';

const PAGE_KINDS: Record<VoicePage, PlaceKind[]> = {
  hospital: ['hospital'],
  blood: ['blood_bank'],
  ambulance: ['ambulance', 'hospital'],
  doctor: ['doctor', 'clinic'],
  pharmacy: ['pharmacy'],
  map: ['hospital', 'clinic', 'doctor', 'pharmacy', 'blood_bank', 'ambulance'],
};

const HINTS: Record<VoicePage, string> = {
  hospital: '“Sabse paas hospital”, “Saroj hospital ka rasta”',
  blood: '“B+ blood 2 units chahiye”',
  ambulance: '“Accident hua hai, ambulance bhejo”',
  doctor: '“Bachchon ka doctor paas mein”',
  pharmacy: '“Paas ki medical shop”, “Apollo pharmacy”',
  map: '“Nearest pharmacy dikhao”',
};

type State = 'idle' | 'listening' | 'thinking' | 'speaking';

const T = (lang: ReplyLang, en: string, hi: string, he: string) => (lang === 'hi' ? hi : lang === 'hi-en' ? he : en);

/** Voice help scoped to the current page; anything else is handed to the SOS Agent. */
export function PageVoice({ page, className }: { page: VoicePage; className?: string }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const places = useAppStore((s) => s.places);
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId);
  const [state, setState] = useState<State>('idle');
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');

  const say = async (text: string, lang: ReplyLang) => {
    setReply(text);
    setState('speaking');
    await voiceService.speak(text, lang);
    setState('idle');
  };

  const toAgent = (text: string) => {
    stopSpeaking();
    navigate(`/agent?q=${encodeURIComponent(text)}`);
  };

  const handle = async (text: string) => {
    const t = text.toLowerCase();
    const lang = nextLang(text, i18n.language?.startsWith('hi') ? 'hi-en' : 'en');
    const task = detectTask(t);
    const emergency = findEmergency(t);

    // Emergencies and other services → the SOS Agent takes over
    const pageTask = page === 'doctor' ? 'doctor' : page === 'map' ? null : page;
    const mapOk = page === 'map' && (task === 'hospital' || task === 'doctor' || task === 'pharmacy');
    if (emergency || page === 'ambulance' || (task && task !== pageTask && !mapOk)) {
      setReply(T(lang, 'Handing this to the SOS Agent…', 'इसे SOS एजेंट को दे रहा हूँ…', 'Ise SOS Agent ko de raha hoon…'));
      toAgent(text);
      return;
    }

    // Blood page: fill group/units and search
    if (page === 'blood') {
      const group = parseBloodGroup(text);
      const units = parseUnits(text);
      if (!group) {
        await say(T(lang, 'Which blood group do you need?', 'कौन सा ब्लड ग्रुप चाहिए?', 'Kaunsa blood group chahiye?'), lang);
        return;
      }
      const q = new URLSearchParams({ group });
      if (units) q.set('units', String(units));
      navigate(`/blood?${q}`);
      await say(
        T(lang, `Searching ${group} blood banks and donors near you.`, `${group} के लिए पास के ब्लड बैंक और डोनर ढूँढ रहा हूँ।`, `${group} ke liye paas ke blood banks aur donors dhoondh raha hoon.`),
        lang,
      );
      return;
    }

    // Place pages: find by name, else nearest of this page's kind (or the kind asked on the map page)
    const kinds: PlaceKind[] =
      page === 'map' && task ? (task === 'doctor' ? ['doctor', 'clinic'] : [task as PlaceKind]) : PAGE_KINDS[page];
    const pool = places.filter((p) => kinds.includes(p.kind)).sort((a, b) => a.distanceKm - b.distanceKm);
    const words = t.replace(/[^a-zऀ-ॿ0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
    const byName = pool.find((p) => words.some((w) => p.name.toLowerCase().includes(w) && !['hospital', 'pharmacy', 'clinic', 'medical', 'doctor', 'nearest', 'sabse'].includes(w)));
    const target = byName ?? pool[0];
    if (!target) {
      await say(T(lang, 'Still loading places near you, please try again in a moment.', 'पास की जगहें लोड हो रही हैं, थोड़ी देर में फिर कोशिश करें।', 'Paas ki jagah load ho rahi hai, thodi der mein phir try karein.'), lang);
      return;
    }
    setSelectedPlaceId(target.id);
    const phone = target.phone ? T(lang, ' You can call them from the map card.', ' मैप कार्ड से कॉल कर सकते हैं।', ' Map card se call kar sakte hain.') : '';
    await say(
      T(
        lang,
        `${byName ? '' : 'Nearest: '}${target.name}, ${target.distanceKm} km away. Route is on the map.${phone}`,
        `${byName ? '' : 'सबसे पास: '}${target.name}, ${target.distanceKm} किलोमीटर। रास्ता मैप पर है।${phone}`,
        `${byName ? '' : 'Sabse paas: '}${target.name}, ${target.distanceKm} km. Route map par hai.${phone}`,
      ),
      lang,
    );
  };

  const run = async () => {
    if (voiceService.isListening()) {
      voiceService.stopListening();
      return;
    }
    if (state !== 'idle') return;
    try {
      setReply('');
      setHeard('');
      setState('listening');
      const text = await voiceService.startListening(i18n.language);
      setHeard(text);
      setState('thinking');
      await handle(text);
    } catch {
      setState('idle');
      setReply('Could not hear you — tap and try again.');
    }
  };

  const label =
    state === 'listening' ? 'Listening… tap to stop' : state === 'thinking' ? 'Understanding…' : state === 'speaking' ? 'Speaking…' : 'Ask by voice';

  return (
    <div className={cn('rounded-2xl border-2 border-primary/15 bg-primary-soft/60 p-3', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          aria-label={label}
          className={cn(
            'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-voice)]',
            state === 'listening' ? 'bg-sos text-white' : 'bg-primary text-accent',
          )}
        >
          {state === 'listening' && !reduce && (
            <motion.span className="absolute inset-0 rounded-full bg-sos/40" animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 1 }} />
          )}
          <Icon name="mic" size={20} strokeWidth={2.25} />
        </button>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-primary">{label}</p>
          <p className="truncate text-[12.5px] text-text-secondary">Try: {HINTS[page]}</p>
        </div>
      </div>
      <AnimatePresence>
        {(heard || reply) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2.5 space-y-1 rounded-xl bg-surface p-3 text-[13.5px]">
            {heard && (
              <p className="text-text-secondary">
                <span className="font-semibold text-text">You:</span> {heard}
              </p>
            )}
            {reply && (
              <p>
                <span className="font-semibold text-primary">HelpMe:</span> {reply}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
