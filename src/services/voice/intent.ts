/**
 * Rule-based intent parser for English, Hindi (Devanagari) and Hinglish (Roman).
 * Turns a Prisma transcript into app actions + a short reply in the user's language.
 */
import type { VoiceResult, VoiceToolCall } from './voiceService';

export type ReplyLang = 'en' | 'hi' | 'hi-en';

const DEVANAGARI = /[ऀ-ॿ]/;
const HINGLISH =
  /\b(chahiye|chaiye|bulao|bula|kahan|kaha|mujhe|jaldi|paas|dikhao|batao|mein|wala|wali|karo|kijiye|hai|hain|nahi|bhai|madad|khoon|dawai|dawa)\b/i;

export function detectReplyLang(transcript: string, uiLang: string): ReplyLang {
  if (DEVANAGARI.test(transcript)) return 'hi';
  if (HINGLISH.test(transcript)) return 'hi-en';
  return uiLang.startsWith('hi') ? 'hi' : 'en';
}

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

function parseBloodGroup(t: string): string | null {
  const latin = t.match(/\b(ab|a|b|o)\s*(\+|-|positive|pos|negative|neg|ve\+|ve-)/i);
  if (latin) {
    const g = latin[1].toUpperCase();
    const sign = /-|neg/i.test(latin[2]) ? '-' : '+';
    return g + sign;
  }
  const hi = t.match(/(एबी|ए|बी|ओ)\s*(पॉजिटिव|पॉज़िटिव|पोजिटिव|पॉजीटिव|नेगेटिव|निगेटिव|\+|-)/);
  if (hi) {
    const map: Record<string, string> = { एबी: 'AB', ए: 'A', बी: 'B', ओ: 'O' };
    const sign = /नेगेटिव|निगेटिव|-/.test(hi[2]) ? '-' : '+';
    return map[hi[1]] + sign;
  }
  return null;
}

function parseUnits(t: string): number | null {
  const m = t.match(/(\d+)\s*(unit|units|यूनिट|bottle|बोतल)/i);
  if (m) return Number(m[1]);
  const words: Record<string, number> = { ek: 1, do: 2, teen: 3, char: 4, एक: 1, दो: 2, तीन: 3, चार: 4, one: 1, two: 2, three: 3, four: 4 };
  const w = t.match(/(ek|do|teen|char|एक|दो|तीन|चार|one|two|three|four)\s*(unit|units|यूनिट|bottle|बोतल)/i);
  return w ? words[w[1].toLowerCase()] ?? null : null;
}

type Copy = Record<ReplyLang, string>;

const R = {
  hospital: { en: 'Showing the nearest hospitals on the map.', hi: 'नज़दीकी अस्पताल मैप पर दिखा रहा हूँ।', 'hi-en': 'Aapke paas ke hospitals map par dikha raha hoon.' },
  doctor: { en: 'Showing doctors and clinics near you.', hi: 'आपके पास के डॉक्टर और क्लिनिक दिखा रहा हूँ।', 'hi-en': 'Aapke paas ke doctors aur clinics dikha raha hoon.' },
  pharmacy: { en: 'Showing pharmacies near you.', hi: 'आपके पास की दवा की दुकानें दिखा रहा हूँ।', 'hi-en': 'Aapke paas ki medical shops dikha raha hoon.' },
  ambulance: { en: 'Opening ambulance help. For a life-threatening emergency, call 108 now.', hi: 'एम्बुलेंस सहायता खोल रहा हूँ। गंभीर स्थिति में अभी 108 पर कॉल करें।', 'hi-en': 'Ambulance help khol raha hoon. Serious emergency ho to abhi 108 call karein.' },
  sos: { en: 'Opening SOS. Call 112 if you are in danger.', hi: 'SOS खोल रहा हूँ। खतरे में हों तो 112 पर कॉल करें।', 'hi-en': 'SOS khol raha hoon. Khatre mein ho to 112 call karein.' },
  toHindi: { en: 'Switching to Hindi.', hi: 'अब मैं हिंदी में बात करूँगा।', 'hi-en': 'Ab main Hindi mein baat karunga.' },
  toEnglish: { en: 'Switching to English.', hi: 'अब मैं अंग्रेज़ी में बात करूँगा।', 'hi-en': 'Ab main English mein baat karunga.' },
  fallback: {
    en: 'I can find hospitals, blood, doctors, medicine, or an ambulance. Try saying: nearest hospital.',
    hi: 'मैं अस्पताल, खून, डॉक्टर, दवा या एम्बुलेंस ढूँढ सकता हूँ। बोलिए: नज़दीकी अस्पताल।',
    'hi-en': 'Main hospital, blood, doctor, dawai ya ambulance dhoondh sakta hoon. Boliye: nearest hospital.',
  },
} satisfies Record<string, Copy>;

function bloodReply(lang: ReplyLang, group: string | null, units: number | null): string {
  const g = group ?? '';
  const u = units ? ` ${units}` : '';
  if (lang === 'hi') return `${g} खून के${u ? `${u} यूनिट के` : ''} लिए पास के डोनर और ब्लड बैंक दिखा रहा हूँ।`.replace(/\s+/g, ' ').trim();
  if (lang === 'hi-en') return `${g} blood${u ? `,${u} units` : ''} ke liye paas ke donors aur blood banks dikha raha hoon.`.replace(/\s+/g, ' ').trim();
  return `Searching ${g} blood${u ? `,${u} units,` : ''} — showing nearby donors and blood banks.`.replace(/\s+/g, ' ').trim();
}

export function interpret(transcript: string, uiLang: string): VoiceResult {
  const t = transcript.toLowerCase().trim();
  const lang = detectReplyLang(transcript, uiLang);
  const out = (reply: string, tools: VoiceToolCall[], replyLang: ReplyLang = lang): VoiceResult => ({
    transcript,
    reply,
    replyLang,
    tools,
  });

  // Language switch
  if (has(t, ['hindi me', 'hindi mein', 'हिंदी में', 'हिन्दी में', 'speak hindi', 'in hindi'])) {
    return out(R.toHindi.hi, [{ name: 'switchLanguage', args: { lang: 'hi' } }], 'hi');
  }
  if (has(t, ['english me', 'english mein', 'अंग्रेज़ी', 'अंग्रेजी', 'speak english', 'in english'])) {
    return out(R.toEnglish.en, [{ name: 'switchLanguage', args: { lang: 'en' } }], 'en');
  }

  // Blood first (so "blood bank hospital" goes to blood)
  const group = parseBloodGroup(transcript);
  if (group || has(t, ['blood', 'khoon', 'khun', 'donor', 'खून', 'रक्त', 'ब्लड', 'डोनर'])) {
    const units = parseUnits(transcript);
    const args: Record<string, string> = {};
    if (group) args.group = group;
    if (units) args.units = String(units);
    return out(bloodReply(lang, group, units), [{ name: 'findBlood', args }]);
  }

  if (has(t, ['ambulance', 'ambulence', 'एम्बुलेंस', 'एंबुलेंस', 'ऐम्बुलेंस', '108', '102'])) {
    return out(R.ambulance[lang], [{ name: 'requestAmbulance', args: {} }]);
  }
  if (has(t, ['sos', 'emergency', 'help me', 'bachao', 'बचाओ', 'इमरजेंसी', 'आपातकाल'])) {
    return out(R.sos[lang], [{ name: 'sendAlert', args: {} }]);
  }
  if (has(t, ['hospital', 'aspatal', 'हॉस्पिटल', 'अस्पताल', 'हस्पताल'])) {
    return out(R.hospital[lang], [{ name: 'findPlaces', args: { kind: 'hospital' } }]);
  }
  if (has(t, ['doctor', 'clinic', 'daktar', 'डॉक्टर', 'डाक्टर', 'क्लिनिक'])) {
    return out(R.doctor[lang], [{ name: 'findPlaces', args: { kind: 'doctor' } }]);
  }
  if (has(t, ['pharmacy', 'medicine', 'medical', 'chemist', 'dawai', 'dawa', 'दवा', 'दवाई', 'फार्मेसी', 'मेडिकल', 'केमिस्ट'])) {
    return out(R.pharmacy[lang], [{ name: 'findPlaces', args: { kind: 'pharmacy' } }]);
  }
  return out(R.fallback[lang], []);
}
