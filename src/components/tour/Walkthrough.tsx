import { motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui';

const KEY = 'helpme-tour-v2';

const STEPS = [
  {
    target: 'sos',
    title: 'SOS Agent',
    body: 'In an emergency, tap here and just speak. The agent asks only what is needed and starts finding help immediately.',
  },
  {
    target: 'evaluation',
    title: 'Evaluation for judges',
    body: 'Demo video, the full workflow diagram (how Gnani AI powers every voice step), impact data and future scope — all in one place.',
  },
  {
    target: 'services',
    title: '6 services, one tap',
    body: 'Hospitals, blood, ambulance, doctors, medicine and the AI voice helper. Red cards are the most urgent ones.',
  },
  {
    target: 'map',
    title: 'Live map near you',
    body: 'See real hospitals, pharmacies and blood banks around you. Filter, search, and open any place in Google Maps.',
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export function startWalkthrough() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('helpme:tour'));
}

export function Walkthrough() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  });

  // auto-start on first visit
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === 'done';
    } catch {
      /* ignore */
    }
    const id = !seen ? window.setTimeout(() => setStep(0), 900) : undefined;
    const manual = () => setStep(0);
    window.addEventListener('helpme:tour', manual);
    return () => {
      if (id) window.clearTimeout(id);
      window.removeEventListener('helpme:tour', manual);
    };
  }, []);

  const measure = useCallback(() => {
    if (step == null) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step]!.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 10, left: r.left - 10, width: r.width + 20, height: r.height + 20 });
  }, [step]);

  useLayoutEffect(() => {
    if (step == null) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step]!.target}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    measure();
    let frame = 0;
    const loop = () => {
      measure();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const iv = window.setInterval(measure, 150); // works even when rAF is throttled
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(iv);
    };
  }, [step, measure]);

  const close = () => {
    try {
      localStorage.setItem(KEY, 'done');
    } catch {
      /* ignore */
    }
    setStep(null);
    setRect(null);
  };

  useEffect(() => {
    if (step == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setStep((s) => (s != null && s < STEPS.length - 1 ? s + 1 : s));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (step == null || !rect) return null;
  const s = STEPS[step]!;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const cardW = Math.min(360, vw - 32);
  const cardH = cardHeight || 230;
  const pad = 14;
  let cardTop: number;
  let cardLeft: number;
  const roomRight = vw - (rect.left + rect.width);
  if (rect.left > vw * 0.6 && rect.left - cardW - pad > 16) {
    // target hugs the right edge (e.g. Evaluation tab): put the card to its left, vertically centred
    cardLeft = rect.left - cardW - pad;
    cardTop = rect.top + rect.height / 2 - cardH / 2;
  } else if (rect.top + rect.height + pad + cardH <= vh - 16) {
    cardTop = rect.top + rect.height + pad; // below
    cardLeft = rect.left;
  } else if (rect.top - pad - cardH >= 16) {
    cardTop = rect.top - pad - cardH; // above
    cardLeft = rect.left;
  } else if (roomRight > cardW + pad + 16) {
    cardLeft = rect.left + rect.width + pad; // beside
    cardTop = rect.top;
  } else {
    cardTop = vh - cardH - 16; // overlap, but fully visible
    cardLeft = rect.left;
  }
  cardTop = Math.min(Math.max(16, cardTop), vh - cardH - 16);
  cardLeft = Math.min(Math.max(16, cardLeft), vw - cardW - 16);

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Walkthrough">
      {/* spotlight */}
      <motion.div
        className="pointer-events-none fixed rounded-[28px] border-[3px] border-accent"
        animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{ boxShadow: '0 0 0 9999px rgba(18, 30, 22, 0.68)' }}
      >
        <motion.span
          className="absolute inset-0 rounded-[26px] border-2 border-accent"
          animate={{ opacity: [0.9, 0], scale: [1, 1.06] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      </motion.div>
      {/* click-catcher */}
      <button type="button" aria-label="Close tour" className="absolute inset-0 cursor-default" onClick={close} />

        <motion.div
          key={step}
          ref={cardRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed rounded-3xl bg-surface p-5 shadow-[var(--shadow-float)]"
          style={{ top: cardTop, left: cardLeft, width: cardW }}
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-bold text-on-accent">
              {step + 1} / {STEPS.length}
            </span>
            <button type="button" onClick={close} className="text-[13px] font-semibold text-text-secondary hover:text-text">
              Skip
            </button>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-[20px] font-semibold leading-tight">{s.title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{s.body}</p>
          {s.target === 'evaluation' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-display)] text-[12px] font-bold text-accent">VS</span>
            <span className="min-w-0 leading-tight">
              <span className="block text-[12.5px] font-semibold text-text">Built by Vansh Singla</span>
              <a href="mailto:vs.vansh19@gmail.com" className="block truncate text-[12px] text-primary underline decoration-accent underline-offset-2">
                vs.vansh19@gmail.com
              </a>
            </span>
          </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-2 bg-surface-high'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)} className="h-10 rounded-full border border-border px-4 text-[13px] font-semibold">
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : close())}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary pl-4 pr-1.5 text-[13px] font-semibold text-white"
              >
                {step < STEPS.length - 1 ? 'Next' : 'Got it'}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary-dark">
                  <Icon name={step < STEPS.length - 1 ? 'chevronRight' : 'check'} size={15} strokeWidth={2.5} />
                </span>
              </button>
            </div>
          </div>
        </motion.div>
    </div>,
    document.body,
  );
}
