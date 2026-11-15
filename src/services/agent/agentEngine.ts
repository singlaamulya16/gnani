/**
 * HelpMe SOS Agent — fast, emergency-first conversational engine (EN / Hindi / Hinglish).
 *
 * Principles:
 *  - Act immediately as soon as there is enough to start (no "shall I start?" in emergencies).
 *  - Emergencies (accident, labour, head injury, burns…) dispatch an ambulance at once,
 *    then give first-aid steps while help is on the way.
 *  - Ask follow-ups only to refine, never to block.
 *  - Off-topic messages get a short "not relevant" reply and never restart a task.
 */
import type { ReplyLang } from '@/services/voice/intent';

export type AgentTask = 'blood' | 'ambulance' | 'hospital' | 'doctor' | 'pharmacy';
export type AgentStage = 'intro' | 'collect' | 'execute' | 'done';

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
  /** optional follow-up we asked after acting */
  asking: keyof AgentSlots | null;
  lang: ReplyLang;
}

export interface AgentTurn {
  state: AgentState;
  reply: string;
  /** run the task now */
  execute: boolean;
  quick: string[];
  /** first-aid steps to show/speak (emergencies) */
  firstAid?: string[];
}

export const initialAgentState = (uiLang: string): AgentState => ({
  task: null,
  stage: 'intro',
  slots: {},
  asking: null,
  lang: uiLang.startsWith('hi') ? 'hi-en' : 'hi-en', // Hinglish greeting by default; adapts to the user's language
});

type Copy = Record<ReplyLang, string>;
const L = (c: Copy, lang: ReplyLang) => c[lang];

export const GREETING: Copy = {
  en: "Hi, I'm the HelpMe helper agent. Tell me what the problem is — blood, ambulance, accident, hospital, doctor or medicine. I'll start helping right away.",
  hi: 'नमस्ते, मैं HelpMe हेल्पर एजेंट हूँ। आप बोल सकते हैं कि क्या दिक्कत है — खून, एम्बुलेंस, एक्सीडेंट, अस्पताल, डॉक्टर या दवा। मैं तुरंत मदद शुरू करूँगा।',
  'hi-en': 'Namaste, main HelpMe helper agent hoon. Aap bol sakte ho ki kya dikkat hai — blood, ambulance, accident, hospital, doctor ya dawai. Main turant madad shuru karunga.',
};

/* ---------------- language (sticky) ---------------- */

const DEVANAGARI = /[ऀ-ॿ]/;
const HINGLISH = /\b(chahiye|chaiye|bulao|bula|kahan|kaha|mujhe|jaldi|paas|dikhao|batao|mein|wala|wali|karo|kijiye|hai|hain|nahi|nahin|haan|han|ji|theek|thik|hua|kya|ke|ki|liye|bachche|behosh|dawai|dawa|khoon|madad|bhai|abhi|lagi|gaya|gayi|raha|rahi|liya|kaat|ne|ko|se|pe|par|mera|meri|mere)\b/i;
const ENGLISH = /\b(i|need|needs|please|the|is|are|my|he|she|yes|no|want|nearest|near|help|units?|patient|what|how|okay|ok|got|has|have)\b/i;

export function nextLang(text: string, prev: ReplyLang): ReplyLang {
  if (DEVANAGARI.test(text)) return 'hi';
  if (HINGLISH.test(text)) return prev === 'hi' ? 'hi' : 'hi-en';
  if (ENGLISH.test(text) && text.trim().split(/\s+/).length >= 2) return 'en';
  return prev;
}

/* ---------------- parsing ---------------- */

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Latin keywords match at word starts (short ones as whole words); Devanagari/phrases as substrings. */
const has = (t: string, words: string[]) =>
  words.some((w) => {
    if (/[\u0900-\u097F]/.test(w) || w.startsWith(' ') || w.endsWith(' ')) return t.includes(w);
    const tail = w.length <= 4 ? '(?![a-z])' : '';
    return new RegExp(`(^|[^a-z])${esc(w)}${tail}`, 'i').test(t);
  });
const YES = ['yes', 'yeah', 'yep', 'haan', ' han ', ' haa', ' ha ', ' ji', 'ok', 'okay', 'theek', 'thik', 'sahi', 'kar do', 'karo', 'sure', 'हाँ', 'हां', 'जी', 'ठीक', 'सही', 'कर दो', 'करो'];
const NO = [' no ', 'nope', 'nahi', 'nahin', ' mat ', 'cancel', 'नहीं', 'नही', ' मत ', 'रद्द', ' na '];
export const isNo = (t: string) => has(` ${t.replace(/[.,!?।]/g, ' ')} `, NO);
export const isYes = (t: string) => has(` ${t.replace(/[.,!?।]/g, ' ')} `, YES) && !isNo(t);

export function parseBloodGroup(t: string): string | null {
  const latin = t.match(/\b(ab|a|b|o)\s*(\+|-|positive|pos|negative|neg|\s?\+ve|\s?-ve)/i);
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
    const d = t.match(/^\s*(\d{1,2})\s*[.।]?\s*$/);
    if (d) return Number(d[1]);
  }
  return null;
}

function parseHospital(raw: string): string | null {
  if (/(किसी|kisi|koi|no|not|नहीं|nahi)\s+(hospital|अस्पताल)/i.test(raw)) return null;
  const m = raw.match(/([A-Za-zऀ-ॿ.'&-]+(?:\s+[A-Za-zऀ-ॿ.'&-]+){0,3})\s+(hospital|अस्पताल|हॉस्पिटल|nursing home)/i);
  if (m) {
    const words = m[1]!.split(/\s+/).filter((w) => !/^(at|in|to|mein|me|में|the|patient|is|hai|ke|ki|for|units?|blood|chahiye|चाहिए|यूनिट|किसी|kisi|any|a)$/i.test(w) && !/\d/.test(w) && !/^(ab|a|b|o)[+-]?$/i.test(w) && !/(positive|negative)/i.test(w));
    const name = words.slice(-3).join(' ');
    if (name) return `${name} ${m[2]!}`.replace(/\s+/g, ' ').trim();
  }
  return null;
}

/* ---------------- emergencies + first aid ---------------- */

interface Emergency {
  key: string;
  words: string[];
  label: Copy;
  aid: Record<ReplyLang, string[]>;
  critical?: boolean;
}

export const EMERGENCIES: Emergency[] = [
  {
    key: 'head', critical: true,
    words: ['head injur', 'head hurt', 'hit on the head', 'sir pe', 'sar pe', 'sir mein chot', 'sar mein chot', 'sir fat', 'सिर', 'सर पे', 'सर में'],
    label: { en: 'Head injury', hi: 'सिर में चोट', 'hi-en': 'Sir mein chot' },
    aid: {
      en: ['Keep the head and neck still — do not move the patient unnecessarily', 'Press a clean cloth on bleeding; do not press on a dent in the skull', 'Watch breathing and keep them awake and talking'],
      hi: ['सिर और गर्दन को हिलने न दें', 'खून बह रहा हो तो साफ़ कपड़े से हल्का दबाएँ', 'साँस पर नज़र रखें और मरीज़ से बात करते रहें'],
      'hi-en': ['Sir aur gardan ko hilne na dein', 'Khoon beh raha ho to saaf kapde se halka dabayein', 'Saans check karte rahein aur patient se baat karte rahein'],
    },
  },
  {
    key: 'accident', critical: true,
    words: ['accident', 'crash', 'hit by', 'takkar', 'durghatna', 'injur', 'bleeding', 'khoon beh', 'chot', 'fracture', 'haddi', 'दुर्घटना', 'एक्सीडेंट', 'चोट', 'टक्कर', 'हड्डी', 'खून बह'],
    label: { en: 'Accident / injury', hi: 'दुर्घटना / चोट', 'hi-en': 'Accident / chot' },
    aid: {
      en: ['Make the area safe; do not crowd the patient', 'Press firmly on bleeding with a clean cloth', 'Do not move them if you suspect a neck or back injury'],
      hi: ['जगह सुरक्षित करें, भीड़ न लगाएँ', 'खून बह रहा हो तो साफ़ कपड़े से कसकर दबाएँ', 'गर्दन या कमर में चोट लगे तो मरीज़ को न हिलाएँ'],
      'hi-en': ['Jagah safe karein, bheed na lagayein', 'Khoon beh raha ho to saaf kapde se zor se dabayein', 'Gardan ya kamar mein chot ho to patient ko na hilayein'],
    },
  },
  {
    key: 'pregnancy',
    words: ['pregnan', 'delivery', 'labour', 'labor', 'garbh', 'dard shuru', 'water broke', 'pani toot', 'प्रेग्नेंट', 'डिलीवरी', 'गर्भ', 'प्रसव', 'लेबर'],
    label: { en: 'Pregnancy / labour', hi: 'प्रसव / गर्भावस्था', 'hi-en': 'Pregnancy / delivery' },
    aid: {
      en: ['Help her lie on her left side and stay calm', 'Note when the pains started and how often they come', 'Keep her hospital file, ID and a clean cloth ready'],
      hi: ['उन्हें बाईं करवट लिटाएँ और शांत रखें', 'दर्द कब शुरू हुआ और कितनी देर में आ रहा है, नोट करें', 'अस्पताल की फ़ाइल, आईडी और साफ़ कपड़ा तैयार रखें'],
      'hi-en': ['Unhe left side karwat litayein aur shaant rakhein', 'Dard kab shuru hua aur kitni der mein aa raha hai, note karein', 'Hospital file, ID aur saaf kapda ready rakhein'],
    },
  },
  {
    key: 'unconscious', critical: true,
    words: ['unconscious', 'not breathing', 'saans nahi', 'साँस नहीं', 'सांस नहीं', 'faint', 'behosh', 'collapsed', 'gir gaya', 'gir gayi', 'बेहोश', 'गिर गया', 'गिर गई'],
    label: { en: 'Unconscious / fainted', hi: 'बेहोश', 'hi-en': 'Behosh' },
    aid: {
      en: ['Check breathing; if breathing, roll them on their side', 'If not breathing, start chest compressions', 'Do not give water or food'],
      hi: ['साँस चेक करें; साँस चल रही है तो करवट दिलाएँ', 'साँस नहीं चल रही तो CPR शुरू करें', 'पानी या खाना न दें'],
      'hi-en': ['Saans check karein; chal rahi hai to karwat dilayein', 'Saans nahi chal rahi to CPR shuru karein', 'Paani ya khana na dein'],
    },
  },
  {
    key: 'heart', critical: true,
    words: ['heart', 'chest pain', 'chest', 'dil', 'seene', 'सीने', 'दिल', 'हार्ट', 'छाती'],
    label: { en: 'Chest pain / heart', hi: 'सीने में दर्द / दिल', 'hi-en': 'Chest pain / heart' },
    aid: {
      en: ['Sit them down, loosen tight clothing', 'If not allergic, they may chew one 325 mg aspirin', 'If they collapse and are not breathing, start chest compressions'],
      hi: ['मरीज़ को बिठाएँ, कपड़े ढीले करें', 'एलर्जी न हो तो एक एस्पिरिन चबाने दें', 'बेहोश होकर साँस न ले तो छाती दबाना (CPR) शुरू करें'],
      'hi-en': ['Patient ko bithayein, kapde dheele karein', 'Allergy na ho to ek aspirin chabane dein', 'Behosh ho aur saans na le to CPR shuru karein'],
    },
  },
  {
    key: 'breathing', critical: true,
    words: ['breath', 'saans', 'सांस', 'साँस', 'asthma', 'दमा', 'oxygen', 'choking', 'gale mein'],
    label: { en: 'Breathing trouble', hi: 'सांस की तकलीफ़', 'hi-en': 'Saans ki taklif' },
    aid: {
      en: ['Sit them upright, open windows, loosen clothing', 'Use their inhaler if they have one', 'If choking, give firm back blows between the shoulder blades'],
      hi: ['सीधा बिठाएँ, खिड़की खोलें, कपड़े ढीले करें', 'इनहेलर हो तो इस्तेमाल करवाएँ', 'गले में कुछ फँसा हो तो पीठ पर कंधों के बीच ज़ोर से थपकी दें'],
      'hi-en': ['Seedha bithayein, khidki kholein, kapde dheele karein', 'Inhaler ho to use karwayein', 'Gale mein kuch phansa ho to peeth par zor se thapki dein'],
    },
  },
  {
    key: 'stroke', critical: true,
    words: ['stroke', 'paralys', 'face droop', 'muh tedha', 'लकवा', 'मुँह टेढ़ा'],
    label: { en: 'Stroke signs', hi: 'लकवा के लक्षण', 'hi-en': 'Stroke / lakwa' },
    aid: {
      en: ['Note the time symptoms started — doctors need it', 'Keep them lying with head slightly raised', 'Give nothing by mouth'],
      hi: ['लक्षण कब शुरू हुए, समय नोट करें', 'सिर थोड़ा ऊँचा करके लिटाएँ', 'मुँह से कुछ न दें'],
      'hi-en': ['Symptoms kab shuru hue, time note karein', 'Sir thoda ooncha karke litayein', 'Muh se kuch na dein'],
    },
  },
  {
    key: 'burn',
    words: ['burn', 'jal gaya', 'jal gayi', 'aag', 'जल गया', 'जल गई', 'आग', 'जला'],
    label: { en: 'Burns', hi: 'जलना', 'hi-en': 'Jalna / burn' },
    aid: {
      en: ['Cool the burn under running tap water for 20 minutes', 'Remove rings or tight items near the burn', 'Do not apply ice, toothpaste or oil; cover loosely with clean cloth'],
      hi: ['जले हिस्से पर 20 मिनट तक बहता पानी डालें', 'अँगूठी या टाइट चीज़ें उतार दें', 'बर्फ़, टूथपेस्ट या तेल न लगाएँ; साफ़ कपड़े से ढकें'],
      'hi-en': ['Jale hisse par 20 minute tak behta paani daalein', 'Ring ya tight cheezein utaar dein', 'Barf, toothpaste ya tel na lagayein'],
    },
  },
  {
    key: 'bite',
    words: ['snake', 'saanp', 'sanp', 'dog bite', 'kutte', 'kutta', 'scorpion', 'bichhu', 'सांप', 'साँप', 'कुत्ते', 'कुत्ता', 'बिच्छू'],
    label: { en: 'Snake / animal bite', hi: 'साँप / जानवर का काटना', 'hi-en': 'Saanp / kutte ka kaatna' },
    aid: {
      en: ['Keep the person still and calm; keep the bitten limb below heart level', 'Wash a dog bite with soap and water for 10 minutes', 'Do not cut, suck or tie a tight cloth on a snake bite'],
      hi: ['मरीज़ को शांत और स्थिर रखें, काटा हिस्सा दिल से नीचे रखें', 'कुत्ते के काटे को 10 मिनट साबुन-पानी से धोएँ', 'साँप के काटे पर चीरा, चूसना या कसकर बाँधना न करें'],
      'hi-en': ['Patient ko shaant aur stable rakhein', 'Kutte ke kaate ko 10 minute sabun-paani se dhoyein', 'Saanp ke kaate par cheera, choosna ya kaskar baandhna na karein'],
    },
  },
  {
    key: 'seizure', critical: true,
    words: ['seizure', 'fits', 'fit aa', 'mirgi', 'convuls', 'mirgi', 'मिर्गी', 'दौरा'],
    label: { en: 'Seizure / fits', hi: 'मिर्गी / दौरा', 'hi-en': 'Mirgi / fits' },
    aid: {
      en: ['Clear space around them; protect the head with something soft', 'Do not hold them down or put anything in the mouth', 'After it stops, roll them on their side'],
      hi: ['आसपास की चीज़ें हटा दें, सिर के नीचे कुछ नरम रखें', 'पकड़ें नहीं, मुँह में कुछ न डालें', 'दौरा रुकने पर करवट दिलाएँ'],
      'hi-en': ['Aaspaas ki cheezein hata dein, sir ke neeche kuch naram rakhein', 'Pakdein nahi, muh mein kuch na daalein', 'Daura rukne par karwat dilayein'],
    },
  },
  {
    key: 'poison',
    words: ['poison', 'zehar', 'overdose', 'kha liya', 'pi liya', 'ज़हर', 'जहर', 'खा लिया'],
    label: { en: 'Poisoning', hi: 'ज़हर', 'hi-en': 'Zehar / poisoning' },
    aid: {
      en: ['Do not make them vomit', 'Keep the bottle or packet to show doctors', 'If unconscious, roll them on their side'],
      hi: ['उल्टी न करवाएँ', 'बोतल या पैकेट डॉक्टर को दिखाने के लिए रखें', 'बेहोश हो तो करवट दिलाएँ'],
      'hi-en': ['Ulti na karwayein', 'Bottle ya packet doctor ko dikhane ke liye rakhein', 'Behosh ho to karwat dilayein'],
    },
  },
  {
    key: 'sugar',
    words: ['sugar low', 'low sugar', 'diabet', 'hypo', 'शुगर'],
    label: { en: 'Low sugar / diabetic', hi: 'शुगर कम', 'hi-en': 'Sugar low' },
    aid: {
      en: ['If awake, give sugar, juice or glucose', 'If drowsy or unconscious, give nothing by mouth', 'Check sugar again after 15 minutes if you can'],
      hi: ['होश में हो तो चीनी, जूस या ग्लूकोज़ दें', 'नींद में या बेहोश हो तो मुँह से कुछ न दें', '15 मिनट बाद फिर शुगर चेक करें'],
      'hi-en': ['Hosh mein ho to cheeni, juice ya glucose dein', 'Behosh ho to muh se kuch na dein', '15 minute baad sugar phir check karein'],
    },
  },
  {
    key: 'allergy', critical: true,
    words: ['allerg', 'swelling', 'sujan', 'सूजन', 'एलर्जी'],
    label: { en: 'Severe allergy', hi: 'गंभीर एलर्जी', 'hi-en': 'Allergy' },
    aid: {
      en: ['Use their adrenaline pen (EpiPen) if they have one', 'Sit them up if breathing is hard', 'Remove the trigger (food, sting) if possible'],
      hi: ['EpiPen हो तो लगाएँ', 'साँस में दिक्कत हो तो बिठाएँ', 'वजह (खाना, डंक) हटा दें'],
      'hi-en': ['EpiPen ho to lagayein', 'Saans mein dikkat ho to bithayein', 'Wajah (khana, dank) hata dein'],
    },
  },
];

export function findEmergency(t: string): Emergency | null {
  // order matters: head before generic accident/injury
  return EMERGENCIES.find((e) => has(t, e.words)) ?? null;
}
export function conditionLabel(key: string | undefined, lang: ReplyLang) {
  const c = EMERGENCIES.find((x) => x.key === key);
  return c ? c.label[lang] : key ?? '';
}
export function firstAidFor(key: string | undefined, lang: ReplyLang): string[] {
  return EMERGENCIES.find((x) => x.key === key)?.aid[lang] ?? [];
}
export function isCritical(s: AgentSlots) {
  return s.conscious === 'no' || Boolean(EMERGENCIES.find((x) => x.key === s.condition)?.critical);
}

const SPECIALTIES: { key: string; words: string[] }[] = [
  { key: 'Child specialist', words: ['child', 'baby', 'bachch', 'pediatric', 'paediatric', 'बच्च', 'शिशु'] },
  { key: 'Heart (cardiology)', words: ['cardio', 'heart doctor'] },
  { key: 'Skin', words: ['skin', 'derma', 'त्वचा', 'स्किन'] },
  { key: 'Eye', words: ['eye', 'aankh', 'आंख', 'आँख'] },
  { key: 'Dental', words: ['dent', 'teeth', 'tooth', 'daant', 'दांत', 'दाँत'] },
  { key: 'Women (gynaecology)', words: ['gyn', 'women', 'mahila', 'महिला'] },
  { key: 'General physician', words: ['general', 'headache', 'sir dard', 'सिर दर्द', 'sar dard', 'fever', 'bukhar', 'बुखार', 'physician', 'cough', 'khansi', 'खांसी', 'vomit', 'ulti', 'उल्टी', 'pet dard', 'पेट', 'loose motion', 'dast', 'दस्त'] },
];

export const MEDICINES = ['paracetamol', 'crocin', 'dolo', 'calpol', 'combiflam', 'ibuprofen', 'disprin', 'aspirin', 'insulin', 'ors', 'electral', 'cetirizine', 'allegra', 'azithromycin', 'amoxicillin', 'antibiotic', 'inhaler', 'asthalin', 'pantoprazole', 'pan 40', 'digene', 'eno', 'betadine', 'burnol', 'metformin', 'glucose', 'zincovit', 'vicks'];
const NEG_HOSPITAL = /(किसी|kisi|koi|not in|nahi|नहीं|ghar|घर|home)[^.]*?(hospital|अस्पताल)|(hospital|अस्पताल)[^.]*?(नहीं|nahi|not)/i;

/** What is the user asking for? Emergencies win. */
export function detectTask(t: string): AgentTask | null {
  if (parseBloodGroup(t) || has(t, ['blood', 'khoon chahiye', 'khoon', 'khun', 'donor', 'खून', 'रक्त', 'ब्लड', 'डोनर'])) {
    if (!has(t, ['khoon beh', 'खून बह', 'bleeding'])) return 'blood';
  }
  if (has(t, ['ambulance', 'ambulence', 'एम्बुलेंस', 'एंबुलेंस', 'emergency', 'इमरजेंसी', 'bachao', 'बचाओ', 'sos']) || findEmergency(t)) return 'ambulance';
  if (has(t, ['pharmacy', 'medicine', 'medical store', 'chemist', 'dawai', 'dawa', 'दवा', 'दवाई', 'फार्मेसी', 'केमिस्ट', 'मेडिकल', 'tablet', 'goli', 'गोली', 'syrup', 'सिरप', ...MEDICINES])) return 'pharmacy';
  if (has(t, ['doctor', 'clinic', 'daktar', 'डॉक्टर', 'डाक्टर', 'क्लिनिक', 'specialist']) || SPECIALTIES.some((s) => s.key !== 'General physician' ? has(t, s.words) : has(t, s.words.slice(1)))) return 'doctor';
  if (has(t, ['hospital', 'aspatal', 'हॉस्पिटल', 'अस्पताल', 'icu']) && !NEG_HOSPITAL.test(t)) return 'hospital';
  return null;
}

function extract(task: AgentTask, raw: string, slots: AgentSlots): AgentSlots {
  const t = raw.toLowerCase();
  const s = { ...slots };
  if (task === 'blood') {
    s.group = parseBloodGroup(raw) ?? s.group;
    s.units = parseUnits(raw, /^\s*\d{1,2}\s*[.।]?\s*$/.test(raw)) ?? s.units;
    s.hospital = parseHospital(raw) ?? s.hospital;
  }
  if (task === 'ambulance') {
    const e = findEmergency(t);
    if (e) s.condition = e.key;
    if (has(t, ['behosh', 'बेहोश', 'unconscious', 'not breathing', 'saans nahi'])) s.conscious = 'no';
  }
  if (task === 'doctor') {
    const sp = SPECIALTIES.find((x) => has(t, x.words));
    if (sp) s.specialty = sp.key;
  }
  if (task === 'pharmacy') {
    const m = raw.match(/(?:medicine|dawai|dawa|tablet|goli|दवा|दवाई|गोली)\s+(?:for\s+)?([A-Za-z][\w -]{2,30})/i) ?? raw.match(/([A-Za-z][\w-]{3,20})\s+(?:chahiye|चाहिए|tablet|goli)/i);
    const STOP = /^(chahiye|chaiye|please|near|nearby|store|shop|ki|ka|ke|lena|hai|urgent|abhi|medicine|dawai|mujhe|need)\b/i;
    const known = MEDICINES.find((x) => has(t, [x]));
    if (known) s.medicine = known.charAt(0).toUpperCase() + known.slice(1);
    else if (m && !STOP.test(m[1]!.trim())) s.medicine = m[1]!.trim();
  }
  return s;
}

const REPLY = {
  irrelevant: {
    en: "That doesn't seem related to a medical emergency. Please tell me what help you need — blood, ambulance, hospital, doctor or medicine.",
    hi: 'यह इमरजेंसी से जुड़ा नहीं लगता। कृपया सही बात पूछिए — खून, एम्बुलेंस, अस्पताल, डॉक्टर या दवा।',
    'hi-en': 'Yeh emergency se related nahi lagta. Kuch sahi poochiye — blood, ambulance, hospital, doctor ya dawai.',
  },
  bloodNeedGroup: {
    en: 'Searching blood banks now. Which blood group — for example B positive or O negative?',
    hi: 'ब्लड बैंक ढूँढ रहा हूँ। कौन सा ब्लड ग्रुप चाहिए? जैसे बी पॉजिटिव या ओ नेगेटिव।',
    'hi-en': 'Blood banks dhoondh raha hoon. Kaunsa blood group chahiye? Jaise B positive ya O negative.',
  },
  askCondition: {
    en: 'Ambulance is being arranged. Meanwhile, what happened — accident, chest pain, delivery, head injury?',
    hi: 'एम्बुलेंस बुला रहा हूँ। तब तक बताइए क्या हुआ है — एक्सीडेंट, सीने में दर्द, डिलीवरी, सिर में चोट?',
    'hi-en': 'Ambulance bula raha hoon. Tab tak batayiye kya hua hai — accident, chest pain, delivery, sir mein chot?',
  },
} satisfies Record<string, Copy>;

const QUICK_AFTER = ['Ambulance bulao', 'Nearest hospital', 'Medicine chahiye'];

function bloodGo(s: AgentSlots, lang: ReplyLang): string {
  const u = s.units ? (lang === 'en' ? `, ${s.units} units` : lang === 'hi' ? `, ${s.units} यूनिट` : `, ${s.units} units`) : '';
  return L({
    en: `Got it — ${s.group} blood${u}. Searching blood banks and alerting compatible donors right now.`,
    hi: `ठीक है — ${s.group} खून${u}। अभी ब्लड बैंक ढूँढ रहा हूँ और डोनर्स को अलर्ट कर रहा हूँ।`,
    'hi-en': `Theek hai — ${s.group} blood${u}. Abhi blood banks dhoondh raha hoon aur donors ko alert kar raha hoon.`,
  }, lang);
}

function emergencyGo(s: AgentSlots, lang: ReplyLang): string {
  const what = s.condition ? conditionLabel(s.condition, lang) : '';
  const crit = isCritical(s)
    ? L({ en: ' This is critical — also call 108 now.', hi: ' यह गंभीर है — अभी 108 पर भी कॉल करें।', 'hi-en': ' Yeh serious hai — abhi 108 par bhi call karein.' }, lang)
    : '';
  return (
    L({
      en: `${what ? `${what}. ` : ''}Calling the nearest ambulance and alerting the nearest hospital now.`,
      hi: `${what ? `${what}। ` : ''}अभी नज़दीकी एम्बुलेंस बुला रहा हूँ और अस्पताल को अलर्ट कर रहा हूँ।`,
      'hi-en': `${what ? `${what}. ` : ''}Abhi nearest ambulance bula raha hoon aur hospital ko alert kar raha hoon.`,
    }, lang) + crit
  );
}

function aidIntro(lang: ReplyLang) {
  return L({ en: 'Until help arrives: ', hi: 'मदद पहुँचने तक: ', 'hi-en': 'Madad aane tak: ' }, lang);
}

/** One conversational turn. */
export function agentStep(prev: AgentState, raw: string, _uiLang: string): AgentTurn {
  const text = raw.trim();
  const t = text.toLowerCase();
  const lang = nextLang(text, prev.lang);
  let state: AgentState = { ...prev, lang };
  const detected = detectTask(t);

  // Follow-up answers to our own questions (no new task)
  if (state.asking && state.task) {
    if (state.task === 'blood' && state.asking === 'group') {
      const g = parseBloodGroup(text);
      if (g) {
        const slots = extract('blood', text, { ...state.slots, group: g });
        return { state: { ...state, slots, stage: 'execute', asking: null }, reply: bloodGo(slots, lang), execute: true, quick: [] };
      }
    }
    if (state.task === 'ambulance' && state.asking === 'condition') {
      const e = findEmergency(t);
      if (e) {
        const slots = extract('ambulance', text, state.slots);
        const aid = firstAidFor(slots.condition, lang);
        const crit = isCritical(slots) ? L({ en: ' Also call 108 now.', hi: ' अभी 108 पर भी कॉल करें।', 'hi-en': ' Abhi 108 par bhi call karein.' }, lang) : '';
        return {
          state: { ...state, slots, asking: null, stage: 'done' },
          reply: `${conditionLabel(slots.condition, lang)}. ${aidIntro(lang)}${aid.join('. ')}.${crit}`,
          execute: false,
          quick: QUICK_AFTER,
          firstAid: aid,
        };
      }
    }
  }

  // Extra details for the task already running (e.g. "2 units", "Saroj hospital")
  if (!detected && state.task && (state.stage === 'execute' || state.stage === 'done')) {
    const slots = extract(state.task, text, state.slots);
    if (JSON.stringify(slots) !== JSON.stringify(state.slots)) {
      return {
        state: { ...state, slots },
        reply: L({ en: 'Updated. ', hi: 'अपडेट कर दिया। ', 'hi-en': 'Update kar diya. ' }, lang) + (slots.units && !state.slots.units ? (lang === 'hi' ? `${slots.units} यूनिट।` : `${slots.units} units.`) : slots.hospital && !state.slots.hospital ? slots.hospital : ''),
        execute: false,
        quick: QUICK_AFTER,
      };
    }
  }

  // "Patient is at home / not in any hospital" while a task runs → acknowledge, use current location
  if (state.task && /(ghar|घर|home|kisi hospital|किसी hospital|किसी अस्पताल|not in (a|any) hospital)/i.test(text)) {
    return {
      state: { ...state, slots: { ...state.slots, hospital: L({ en: 'Home (your location)', hi: 'घर (आपकी लोकेशन)', 'hi-en': 'Ghar (aapki location)' }, lang) } },
      reply: L({ en: "Okay, I'm using your current location and showing the nearest options.", hi: 'ठीक है, आपकी मौजूदा लोकेशन के हिसाब से सबसे पास के विकल्प दिखा रहा हूँ।', 'hi-en': 'Theek hai, aapki current location ke hisaab se sabse paas ke options dikha raha hoon.' }, lang),
      execute: false,
      quick: QUICK_AFTER,
    };
  }

  // Nothing medical in this message → not relevant, keep everything as is
  if (!detected) {
    return { state: { ...state, asking: state.asking }, reply: L(REPLY.irrelevant, lang), execute: false, quick: ['Ambulance bulao', 'B+ blood chahiye', 'Nearest hospital'] };
  }

  // New request → act immediately
  const task = detected;
  const slots = extract(task, text, {});
  state = { task, stage: 'execute', slots, asking: null, lang };

  if (task === 'blood') {
    if (!slots.group) {
      // start searching banks anyway, ask group to match donors
      return { state: { ...state, asking: 'group' }, reply: L(REPLY.bloodNeedGroup, lang), execute: true, quick: ['A+', 'B+', 'O+', 'O-', 'AB+'] };
    }
    return { state, reply: bloodGo(slots, lang), execute: true, quick: [] };
  }

  if (task === 'ambulance') {
    if (!slots.condition) {
      return { state: { ...state, asking: 'condition' }, reply: L(REPLY.askCondition, lang), execute: true, quick: ['Accident', 'Chest pain', 'Delivery', 'Sir pe chot', 'Behosh'] };
    }
    const aid = firstAidFor(slots.condition, lang);
    return {
      state,
      reply: `${emergencyGo(slots, lang)} ${aidIntro(lang)}${aid.join('. ')}.`,
      execute: true,
      quick: [],
      firstAid: aid,
    };
  }

  const go: Record<'hospital' | 'doctor' | 'pharmacy', Copy> = {
    hospital: { en: 'Finding the nearest hospitals and the fastest route now.', hi: 'अभी नज़दीकी अस्पताल और सबसे तेज़ रास्ता ढूँढ रहा हूँ।', 'hi-en': 'Abhi nearest hospitals aur fastest route dhoondh raha hoon.' },
    doctor: {
      en: `Searching ${slots.specialty ?? ''} doctors and clinics near you now.`.replace('  ', ' '),
      hi: `अभी आपके पास ${slots.specialty ?? ''} डॉक्टर और क्लिनिक ढूँढ रहा हूँ।`.replace('  ', ' '),
      'hi-en': `Abhi aapke paas ${slots.specialty ?? ''} doctors aur clinics dhoondh raha hoon.`.replace('  ', ' '),
    },
    pharmacy: {
      en: `Finding pharmacies near you${slots.medicine ? ` for ${slots.medicine}` : ''} now.`,
      hi: `अभी पास की दवा की दुकानें ढूँढ रहा हूँ${slots.medicine ? ` (${slots.medicine})` : ''}।`,
      'hi-en': `Abhi paas ki medical shops dhoondh raha hoon${slots.medicine ? ` ${slots.medicine} ke liye` : ''}.`,
    },
  };
  return { state, reply: L(go[task], lang), execute: true, quick: [] };
}

/** Blood types a patient can receive. */
export const COMPATIBLE: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};
