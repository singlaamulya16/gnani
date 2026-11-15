/**
 * HelpMe SOS Agent — conversational slot-filling engine (EN / Hindi / Hinglish).
 * Pure functions: given the current state + what the user said, returns the next state and reply.
 * It extracts every detail it can from one sentence, asks only for what is missing,
 * confirms, then tells the UI to execute the task.
 */
import type { ReplyLang } from '@/services/voice/intent';

export type AgentTask = 'blood' | 'ambulance' | 'hospital' | 'doctor' | 'pharmacy';
export type AgentStage = 'intro' | 'collect' | 'confirm' | 'execute' | 'done';

export interface AgentSlots {
  group?: string;
  units?: number;
  hospital?: string;
  condition?: string;
  conscious?: 'yes' | 'no';
  specialty?: string;
  medicine?: string;
}

export interface AgentState {
  task: AgentTask | null;
  stage: AgentStage;
  slots: AgentSlots;
  asking: keyof AgentSlots | null;
  lang: ReplyLang;
}

export interface AgentTurn {
  state: AgentState;
  reply: string;
  /** true when the UI should run the task now */
  execute: boolean;
  /** suggested quick replies */
  quick: string[];
}

export const initialAgentState = (uiLang: string): AgentState => ({
  task: null,
  stage: 'intro',
  slots: {},
  asking: null,
  lang: uiLang.startsWith('hi') ? 'hi-en' : 'en',
});

type Copy = Record<ReplyLang, string>;
const L = (c: Copy, lang: ReplyLang) => c[lang];

export const GREETING: Copy = {
  en: "Hi, I'm the HelpMe agent. Tell me what you need: blood, an ambulance, a hospital, a doctor or medicine.",
  hi: 'नमस्ते, मैं HelpMe एजेंट हूँ। बताइए क्या चाहिए: खून, एम्बुलेंस, अस्पताल, डॉक्टर या दवा?',
  'hi-en': 'Namaste, main HelpMe agent hoon. Batayiye kya chahiye: blood, ambulance, hospital, doctor ya dawai?',
};

/* ---------------- language (sticky) ---------------- */

const DEVANAGARI = /[\u0900-\u097F]/;
const HINGLISH = /\b(chahiye|chaiye|bulao|bula|kahan|kaha|mujhe|jaldi|paas|dikhao|batao|mein|wala|wali|karo|kijiye|hai|hain|nahi|nahin|haan|han|ji|theek|thik|hua|kya|ke|ki|liye|bachche|behosh|dawai|dawa|khoon|madad|bhai|abhi)\b/i;
const ENGLISH = /\b(i|need|needs|please|the|is|are|my|he|she|yes|no|want|nearest|near|help|units?|patient|what|how|okay|ok)\b/i;

/** Keep the conversation language stable; only switch on a clear signal. */
export function nextLang(text: string, prev: ReplyLang): ReplyLang {
  if (DEVANAGARI.test(text)) return 'hi';
  if (HINGLISH.test(text)) return prev === 'hi' ? 'hi' : 'hi-en';
  if (ENGLISH.test(text) && text.trim().split(/\s+/).length >= 2) return 'en';
  return prev;
}

/* ---------------- parsing helpers ---------------- */

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
const YES = ['yes', 'yeah', 'yep', 'haan', ' han ', ' haa', ' ha ', ' ji', 'ok', 'okay', 'theek', 'thik', 'sahi', 'confirm', 'kar do', 'karo', 'sure', 'हाँ', 'हां', 'जी', 'ठीक', 'सही', 'कर दो', 'करो'];
const NO = [' no ', 'nope', 'nahi', 'nahin', ' mat ', 'cancel', 'नहीं', 'नही', ' मत ', 'रद्द', ' na '];
export const isNo = (t: string) => has(` ${t.replace(/[.,!?।]/g, ' ')} `, NO);
export const isYes = (t: string) => has(` ${t.replace(/[.,!?।]/g, ' ')} `, YES) && !isNo(t);

export function parseBloodGroup(t: string): string | null {
  const latin = t.match(/\b(ab|a|b|o)\s*(\+|-|positive|pos|negative|neg)/i);
  if (latin) return latin[1]!.toUpperCase() + (/-|neg/i.test(latin[2]!) ? '-' : '+');
  const hi = t.match(/(एबी|ए|बी|ओ)\s*(पॉजिटिव|पॉज़िटिव|पोजिटिव|पॉजीटिव|नेगेटिव|निगेटिव|\+|-)/);
  if (hi) {
    const map: Record<string, string> = { एबी: 'AB', ए: 'A', बी: 'B', ओ: 'O' };
    return map[hi[1]!]! + (/नेगेटिव|निगेटिव|-/.test(hi[2]!) ? '-' : '+');
  }
  return null;
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5,
};
export function parseUnits(t: string, bare = false): number | null {
  const m = t.match(/(\d+)\s*(unit|units|यूनिट|bottle|bottles|बोतल|bag|bags)/i);
  if (m) return Number(m[1]);
  const w = t.match(/(one|two|three|four|five|ek|do|teen|chaar|char|paanch|panch|एक|दो|तीन|चार|पांच|पाँच)\s*(unit|units|यूनिट|bottle|बोतल|bag)/i);
  if (w) return NUM_WORDS[w[1]!.toLowerCase()] ?? null;
  if (bare) {
    const d = t.match(/(\d{1,2})/);
    if (d) return Number(d[1]);
    for (const [k, v] of Object.entries(NUM_WORDS)) {
      if (new RegExp(`(^|\\s)${k}($|\\s|[.,!?।])`, 'i').test(t)) return v;
    }
  }
  return null;
}

function parseHospital(raw: string): string | null {
  const m = raw.match(/([A-Za-zऀ-ॿ.'&-]+(?:\s+[A-Za-zऀ-ॿ.'&-]+){0,3})\s+(hospital|अस्पताल|हॉस्पिटल|nursing home)/i);
  if (m) {
    const words = m[1]!.split(/\s+/).filter((w) => !/^(at|in|to|mein|me|में|the|patient|is|hai|ke|ki|for|units?|blood|chahiye|चाहिए|यूनिट)$/i.test(w) && !/\d/.test(w) && !/^(ab|a|b|o)[+-]?$/i.test(w) && !/(positive|negative)/i.test(w));
    const name = words.slice(-3).join(' ');
    if (name) return `${name} ${m[2]!}`.replace(/\s+/g, ' ').trim();
  }
  return null;
}

const CONDITIONS: { key: string; words: string[]; label: Copy }[] = [
  { key: 'accident', words: ['accident', 'injur', 'bleeding', 'durghatna', 'chot', 'दुर्घटना', 'एक्सीडेंट', 'चोट'], label: { en: 'Accident / injury', hi: 'दुर्घटना / चोट', 'hi-en': 'Accident / chot' } },
  { key: 'heart', words: ['heart', 'chest', 'dil', 'seene', 'दिल', 'सीने', 'हार्ट'], label: { en: 'Chest pain / heart', hi: 'सीने में दर्द / दिल', 'hi-en': 'Chest pain / heart' } },
  { key: 'breathing', words: ['breath', 'saans', 'सांस', 'साँस', 'oxygen'], label: { en: 'Breathing trouble', hi: 'सांस की तकलीफ़', 'hi-en': 'Saans ki taklif' } },
  { key: 'pregnancy', words: ['pregnan', 'delivery', 'labour', 'labor', 'garbh', 'प्रेग्नेंट', 'डिलीवरी', 'गर्भ'], label: { en: 'Pregnancy / delivery', hi: 'गर्भावस्था / डिलीवरी', 'hi-en': 'Pregnancy / delivery' } },
  { key: 'unconscious', words: ['unconscious', 'faint', 'behosh', 'बेहोश'], label: { en: 'Unconscious / fainted', hi: 'बेहोश', 'hi-en': 'Behosh' } },
  { key: 'stroke', words: ['stroke', 'paralys', 'लकवा'], label: { en: 'Stroke signs', hi: 'लकवा के लक्षण', 'hi-en': 'Stroke signs' } },
];
export function conditionLabel(key: string | undefined, lang: ReplyLang) {
  const c = CONDITIONS.find((x) => x.key === key);
  return c ? c.label[lang] : key ?? '';
}

const SPECIALTIES: { key: string; words: string[] }[] = [
  { key: 'Child specialist', words: ['child', 'baby', 'bachch', 'pediatric', 'paediatric', 'बच्च', 'शिशु'] },
  { key: 'Heart (cardiology)', words: ['heart', 'cardio', 'dil', 'दिल'] },
  { key: 'Skin', words: ['skin', 'derma', 'त्वचा', 'स्किन'] },
  { key: 'Eye', words: ['eye', 'aankh', 'आंख', 'आँख'] },
  { key: 'Dental', words: ['dent', 'teeth', 'tooth', 'daant', 'दांत', 'दाँत'] },
  { key: 'Women (gynaecology)', words: ['gyn', 'women', 'mahila', 'महिला'] },
  { key: 'General physician', words: ['general', 'fever', 'bukhar', 'बुखार', 'physician', 'any', 'koi bhi', 'कोई भी'] },
];

export function detectTask(t: string): AgentTask | null {
  if (parseBloodGroup(t) || has(t, ['blood', 'khoon', 'khun', 'donor', 'खून', 'रक्त', 'ब्लड', 'डोनर'])) return 'blood';
  if (has(t, ['ambulance', 'ambulence', 'एम्बुलेंस', 'एंबुलेंस', 'accident', 'unconscious', 'behosh', 'बेहोश', 'दुर्घटना', 'heart attack'])) return 'ambulance';
  if (has(t, ['doctor', 'clinic', 'daktar', 'डॉक्टर', 'डाक्टर', 'क्लिनिक', 'specialist'])) return 'doctor';
  if (has(t, ['pharmacy', 'medicine', 'medical store', 'chemist', 'dawai', 'dawa', 'दवा', 'दवाई', 'फार्मेसी', 'केमिस्ट', 'मेडिकल'])) return 'pharmacy';
  if (has(t, ['hospital', 'aspatal', 'हॉस्पिटल', 'अस्पताल', 'icu'])) return 'hospital';
  return null;
}

/** Fill every slot we can find in this utterance for the given task. */
function extract(task: AgentTask, raw: string, slots: AgentSlots, asking: keyof AgentSlots | null): AgentSlots {
  const t = raw.toLowerCase();
  const s = { ...slots };
  const clean = raw.trim().replace(/[।.!]$/, '');
  if (task === 'blood') {
    s.group = parseBloodGroup(raw) ?? s.group;
    s.units = parseUnits(raw, asking === 'units') ?? s.units;
    const h = parseHospital(raw);
    if (h) s.hospital = h;
    else if (asking === 'hospital' && !parseBloodGroup(raw) && clean.length > 1) s.hospital = clean;
  }
  if (task === 'ambulance') {
    const c = CONDITIONS.find((x) => has(t, x.words));
    if (c && (!s.condition || asking === 'condition')) s.condition = c.key;
    else if (!c && asking === 'condition' && clean.length > 1 && !detectTask(t)) s.condition = clean;
    if (c?.key === 'unconscious' || has(t, ['behosh', 'बेहोश', 'unconscious'])) s.conscious = 'no';
    if (asking === 'conscious') {
      if (isNo(t) || has(t, ['not ', 'behosh', 'बेहोश'])) s.conscious = 'no';
      else if (isYes(t) || has(t, ['hosh', 'होश', 'conscious', 'awake', 'baat kar', 'बात कर'])) s.conscious = 'yes';
    }
  }
  if (task === 'doctor') {
    const sp = SPECIALTIES.find((x) => has(t, x.words));
    if (sp) s.specialty = sp.key;
    else if (asking === 'specialty' && clean.length > 1) s.specialty = clean;
  }
  if (task === 'pharmacy') {
    const m = raw.match(/(?:medicine|dawai|dawa|tablet|दवा|दवाई)\s+(?:for\s+|chahiye\s+)?([A-Za-z][\w -]{2,30})/i);
    const STOP = /^(chahiye|chaiye|please|near|nearby|store|shop|ki|ka|ke|lena|leni|hai|urgent|abhi|chahie)\b/i;
    if (m && !STOP.test(m[1]!.trim())) s.medicine = m[1]!.trim();
    else if (asking === 'medicine' && clean.length > 1 && !detectTask(t)) s.medicine = clean;
  }
  return s;
}

const REQUIRED: Record<AgentTask, (keyof AgentSlots)[]> = {
  blood: ['group', 'units', 'hospital'],
  ambulance: ['condition', 'conscious'],
  hospital: [],
  doctor: ['specialty'],
  pharmacy: ['medicine'],
};

const QUESTIONS: Record<string, Copy> = {
  group: { en: 'Which blood group is needed? For example B positive or O negative.', hi: 'कौन सा ब्लड ग्रुप चाहिए? जैसे बी पॉजिटिव या ओ नेगेटिव।', 'hi-en': 'Kaunsa blood group chahiye? Jaise B positive ya O negative.' },
  units: { en: 'How many units are needed?', hi: 'कितने यूनिट चाहिए?', 'hi-en': 'Kitne units chahiye?' },
  hospital: { en: 'Which hospital is the patient in?', hi: 'मरीज़ किस अस्पताल में है?', 'hi-en': 'Patient kis hospital mein hai?' },
  condition: { en: 'What happened? Accident, chest pain, breathing trouble, delivery, or something else?', hi: 'क्या हुआ है? दुर्घटना, सीने में दर्द, सांस की तकलीफ़, डिलीवरी या कुछ और?', 'hi-en': 'Kya hua hai? Accident, chest pain, saans ki taklif, delivery ya kuch aur?' },
  conscious: { en: 'Is the patient conscious and talking?', hi: 'क्या मरीज़ होश में है और बात कर रहा है?', 'hi-en': 'Kya patient hosh mein hai aur baat kar raha hai?' },
  specialty: { en: 'What kind of doctor? For example child specialist, heart, skin, or a general physician.', hi: 'किस तरह का डॉक्टर? जैसे बच्चों का, दिल का, त्वचा का या सामान्य डॉक्टर।', 'hi-en': 'Kaunsa doctor chahiye? Jaise child specialist, heart, skin ya general physician.' },
  medicine: { en: 'Which medicine do you need?', hi: 'कौन सी दवा चाहिए?', 'hi-en': 'Kaunsi dawai chahiye?' },
};

const QUICK: Record<string, string[]> = {
  group: ['A+', 'B+', 'O+', 'O-', 'AB+'],
  units: ['1 unit', '2 units', '3 units'],
  hospital: ['Saroj Hospital', 'Brahm Shakti Hospital', 'Bhagwan Mahavir Hospital'],
  condition: ['Accident', 'Chest pain', 'Breathing trouble', 'Delivery'],
  conscious: ['Yes', 'No'],
  specialty: ['Child specialist', 'General physician', 'Heart'],
  medicine: ['Paracetamol', 'Insulin', 'ORS'],
};

function summary(task: AgentTask, s: AgentSlots, lang: ReplyLang): string {
  if (task === 'blood') {
    return L({
      en: `${s.group} blood, ${s.units} unit${s.units === 1 ? '' : 's'}, at ${s.hospital}. Shall I start the request and alert donors?`,
      hi: `${s.group} खून, ${s.units} यूनिट, ${s.hospital} के लिए। क्या मैं रिक्वेस्ट शुरू करके डोनर्स को अलर्ट करूँ?`,
      'hi-en': `${s.group} blood, ${s.units} units, ${s.hospital} ke liye. Kya main request start karke donors ko alert karun?`,
    }, lang);
  }
  return L({
    en: `${conditionLabel(s.condition, lang)}, patient ${s.conscious === 'no' ? 'not conscious' : 'conscious'}. Shall I request the nearest ambulance to your location now?`,
    hi: `${conditionLabel(s.condition, lang)}, मरीज़ ${s.conscious === 'no' ? 'होश में नहीं' : 'होश में'}। क्या मैं अभी आपकी लोकेशन पर नज़दीकी एम्बुलेंस बुलाऊँ?`,
    'hi-en': `${conditionLabel(s.condition, lang)}, patient ${s.conscious === 'no' ? 'hosh mein nahi' : 'hosh mein'}. Kya main abhi nearest ambulance bulaun?`,
  }, lang);
}

export function isCritical(s: AgentSlots) {
  return s.conscious === 'no' || s.condition === 'heart' || s.condition === 'stroke' || s.condition === 'unconscious' || s.condition === 'breathing';
}

function urgentTip(s: AgentSlots, lang: ReplyLang): string {
  if (!isCritical(s)) return '';
  return L({ en: ' This is critical — please also call 108 right now.', hi: ' यह गंभीर है — कृपया अभी 108 पर भी कॉल करें।', 'hi-en': ' Yeh serious hai — abhi 108 par bhi call karein.' }, lang);
}

/** One conversational turn. */
export function agentStep(prev: AgentState, raw: string, uiLang: string): AgentTurn {
  const text = raw.trim();
  const t = text.toLowerCase();
  const lang = nextLang(text, prev.lang);
  let state: AgentState = { ...prev, lang };

  // Switch to a new task at any time (except when answering a free-text question)
  const newTask = detectTask(t);
  const answeringFreeText = state.asking === 'medicine' || state.asking === 'hospital' || state.asking === 'condition';
  if (newTask && newTask !== state.task && !(answeringFreeText && state.stage === 'collect')) {
    state = { task: newTask, stage: 'collect', slots: {}, asking: null, lang };
  }
  if (!state.task) {
    return {
      state: { ...state, stage: 'intro' },
      reply: L({ en: "Sorry, I didn't get that. Do you need blood, an ambulance, a hospital, a doctor or medicine?", hi: 'माफ़ कीजिए, समझ नहीं आया। आपको खून, एम्बुलेंस, अस्पताल, डॉक्टर या दवा चाहिए?', 'hi-en': 'Sorry, samajh nahi aaya. Aapko blood, ambulance, hospital, doctor ya dawai chahiye?' }, lang),
      execute: false,
      quick: ['B+ blood chahiye', 'Ambulance bulao', 'Nearest hospital'],
    };
  }

  // After a task finished, a new message about the same task starts a fresh request
  if ((state.stage === 'execute' || state.stage === 'done') && state.task && !newTask) {
    state = { ...state, stage: 'collect', slots: {}, asking: REQUIRED[state.task][0] ?? null };
  }

  // Confirmation
  if (state.stage === 'confirm') {
    if (isNo(t) && !parseBloodGroup(text)) {
      const first = REQUIRED[state.task][0] ?? null;
      return {
        state: { ...state, stage: 'collect', slots: {}, asking: first },
        reply: L({ en: "Okay, let's correct it. ", hi: 'ठीक है, फिर से बताइए। ', 'hi-en': 'Theek hai, phir se batayiye. ' }, lang) + (first ? L(QUESTIONS[first]!, lang) : ''),
        execute: false,
        quick: first ? QUICK[first] ?? [] : [],
      };
    }
    const updated = extract(state.task, text, state.slots, null);
    if (isYes(t) || JSON.stringify(updated) === JSON.stringify(state.slots)) {
      return {
        state: { ...state, stage: 'execute', asking: null },
        reply: L({ en: "On it. I'm working on it now — watch the left side.", hi: 'ठीक है, काम शुरू कर रहा हूँ। बाईं तरफ़ देखिए।', 'hi-en': 'Theek hai, kaam shuru kar raha hoon. Left side dekhiye.' }, lang) + urgentTip(state.slots, lang),
        execute: true,
        quick: [],
      };
    }
    state = { ...state, slots: updated };
  }

  // Collect
  const slots = extract(state.task, text, state.slots, state.asking);
  const missing = REQUIRED[state.task].filter((k) => slots[k] == null || slots[k] === '');
  if (missing.length) {
    const next = missing[0]!;
    const gotSomething = JSON.stringify(slots) !== JSON.stringify(state.slots);
    const ack = gotSomething ? L({ en: 'Got it. ', hi: 'ठीक है। ', 'hi-en': 'Theek hai. ' }, lang) : '';
    return {
      state: { ...state, stage: 'collect', slots, asking: next },
      reply: ack + L(QUESTIONS[next]!, lang) + (state.task === 'ambulance' ? urgentTip(slots, lang) : ''),
      execute: false,
      quick: QUICK[next] ?? [],
    };
  }

  if (state.task === 'blood' || state.task === 'ambulance') {
    return {
      state: { ...state, stage: 'confirm', slots, asking: null },
      reply: summary(state.task, slots, lang) + (state.task === 'ambulance' ? urgentTip(slots, lang) : ''),
      execute: false,
      quick: ['Yes', 'No'],
    };
  }
  const go: Record<string, Copy> = {
    hospital: { en: 'Finding the nearest hospitals and the fastest route for you.', hi: 'आपके लिए नज़दीकी अस्पताल और सबसे तेज़ रास्ता ढूँढ रहा हूँ।', 'hi-en': 'Aapke liye nearest hospitals aur fastest route dhoondh raha hoon.' },
    doctor: { en: `Searching ${slots.specialty} doctors and clinics near you.`, hi: `आपके पास ${slots.specialty} डॉक्टर और क्लिनिक ढूँढ रहा हूँ।`, 'hi-en': `Aapke paas ${slots.specialty} doctors aur clinics dhoondh raha hoon.` },
    pharmacy: { en: `Finding pharmacies near you for ${slots.medicine}.`, hi: `${slots.medicine} के लिए पास की दवा की दुकानें ढूँढ रहा हूँ।`, 'hi-en': `${slots.medicine} ke liye paas ki medical shops dhoondh raha hoon.` },
  };
  return {
    state: { ...state, stage: 'execute', slots, asking: null },
    reply: L(go[state.task]!, lang),
    execute: true,
    quick: [],
  };
}
