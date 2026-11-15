/**
 * DEMO ONLY — simulated WhatsApp notifications (no real messages are sent).
 * Two chats: the person who asked for help ("user") and the donor / ambulance ("partner").
 * State is persisted to localStorage and synced across tabs, so the WhatsApp page can be
 * open in a second window while the app runs in the first.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WaChannel = 'user' | 'partner';
export type WaKind = 'text' | 'request' | 'code' | 'location' | 'status';
export type WaStatus = 'pending' | 'accepted' | 'rejected' | 'arrived' | 'started';

export interface WaMsg {
  id: string;
  channel: WaChannel;
  from: 'bot' | 'me';
  text: string;
  time: number;
  kind: WaKind;
  requestId?: string;
}

export interface WaRequest {
  id: string;
  type: 'blood' | 'ambulance';
  title: string;
  detail: string;
  partner: string;
  status: WaStatus;
  code?: string;
  distanceKm: number;
  startKm: number;
  etaMin: number;
  createdAt: number;
}

interface WaState {
  messages: WaMsg[];
  requests: WaRequest[];
  pushRequest: (r: { type: 'blood' | 'ambulance'; title: string; detail: string; partner?: string; distanceKm?: number; ref?: string }) => string;
  accept: (id: string) => void;
  reject: (id: string) => void;
  verifyCode: (id: string, code: string) => boolean;
  reset: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const PARTNERS_BLOOD = ['Karan (B+ donor)', 'Amit (O- donor)', 'Priya (B- donor)', 'Ravi (O+ donor)'];
const AMBULANCE = '108 Ambulance · DL 1C 4521';

const msg = (channel: WaChannel, text: string, kind: WaKind = 'text', requestId?: string, from: 'bot' | 'me' = 'bot'): WaMsg => ({
  id: uid(),
  channel,
  from,
  text,
  time: Date.now(),
  kind,
  requestId,
});

const timers = new Map<string, number>();

export const useWhatsApp = create<WaState>()(
  persist(
    (set, get) => ({
      messages: [],
      requests: [],

      pushRequest: ({ type, title, detail, partner, distanceKm, ref }) => {
        const id = ref ?? uid();
        const p = partner ?? (type === 'blood' ? PARTNERS_BLOOD[get().requests.filter((r) => r.type === 'blood').length % PARTNERS_BLOOD.length]! : AMBULANCE);
        const km = Math.round((distanceKm ?? (type === 'blood' ? 2.6 : 3.4)) * 10) / 10;
        const req: WaRequest = {
          id,
          type,
          title,
          detail,
          partner: p,
          status: 'pending',
          distanceKm: km,
          startKm: km,
          etaMin: Math.max(3, Math.round(km * 3)),
          createdAt: Date.now(),
        };
        set((s) => ({
          requests: [req, ...s.requests.filter((r) => r.id !== id)],
          messages: [
            ...s.messages,
            msg('user', `HelpMe: Your ${type === 'blood' ? 'blood' : 'ambulance'} request is live.\n${title}\n${detail}\nWe are contacting ${p}.`, 'status', id),
            msg('partner', `${type === 'blood' ? 'Blood needed' : 'Emergency pickup'} near you\n${title}\n${detail}\n${km} km away`, 'request', id),
          ],
        }));
        return id;
      },

      accept: (id) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r || r.status !== 'pending') return;
        const code = String(1000 + Math.floor(Math.random() * 9000));
        set((s) => ({
          requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'accepted', code } : x)),
          messages: [
            ...s.messages,
            msg('partner', 'Accept', 'text', id, 'me'),
            msg('partner', `Thank you! Request accepted.\nStart code: ${code}\nAsk the family to confirm this code when you arrive. Sharing your live location with them now.`, 'code', id),
            msg('user', `${r.partner} accepted your request.\nYour start code is ${code} — share it only when they reach you.`, 'code', id),
            msg('user', 'Live location', 'location', id),
            msg('partner', 'Live location shared', 'location', id),
          ],
        }));
        // simulate movement
        const step = Math.max(0.15, r.startKm / 10);
        const t = window.setInterval(() => {
          const cur = useWhatsApp.getState().requests.find((x) => x.id === id);
          if (!cur || cur.status !== 'accepted') {
            window.clearInterval(t);
            return;
          }
          const d = Math.max(0, Math.round((cur.distanceKm - step) * 10) / 10);
          const arrived = d <= 0.05;
          useWhatsApp.setState((s) => ({
            requests: s.requests.map((x) =>
              x.id === id ? { ...x, distanceKm: d, etaMin: Math.max(0, Math.round(d * 3)), status: arrived ? 'arrived' : x.status } : x,
            ),
            messages: arrived
              ? [
                  ...s.messages,
                  msg('user', `${cur.partner} has arrived. Tell them your code ${cur.code} to start.`, 'status', id),
                  msg('partner', `You have arrived. Enter the start code from the family to begin.`, 'status', id),
                ]
              : s.messages,
          }));
          if (arrived) window.clearInterval(t);
        }, 2500);
        timers.set(id, t);
      },

      reject: (id) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r || r.status !== 'pending') return;
        set((s) => ({
          requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)),
          messages: [
            ...s.messages,
            msg('partner', 'Reject', 'text', id, 'me'),
            msg('partner', 'No problem — we will ask someone else.', 'text', id),
            msg('user', `${r.partner} can't make it. Finding the next ${r.type === 'blood' ? 'donor' : 'ambulance'}…`, 'status', id),
          ],
        }));
        window.setTimeout(() => {
          useWhatsApp.getState().pushRequest({ type: r.type, title: r.title, detail: r.detail, distanceKm: r.startKm + 0.8 });
        }, 1800);
      },

      verifyCode: (id, code) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r || !r.code) return false;
        const ok = code.trim() === r.code;
        set((s) => ({
          requests: ok ? s.requests.map((x) => (x.id === id ? { ...x, status: 'started' } : x)) : s.requests,
          messages: [
            ...s.messages,
            msg('partner', code, 'text', id, 'me'),
            ...(ok
              ? [
                  msg('partner', `Code verified. ${r.type === 'blood' ? 'Donation' : 'Trip'} started. Thank you for saving a life!`, 'status', id),
                  msg('user', `Code verified — ${r.type === 'blood' ? 'donation' : 'trip to hospital'} has started.`, 'status', id),
                ]
              : [msg('partner', 'That code does not match. Please check with the family.', 'text', id)]),
          ],
        }));
        return ok;
      },

      reset: () => {
        timers.forEach((t) => window.clearInterval(t));
        timers.clear();
        set({ messages: [], requests: [] });
      },
    }),
    { name: 'helpme-whatsapp-demo' },
  ),
);

// keep other tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'helpme-whatsapp-demo') void useWhatsApp.persist.rehydrate();
  });
}

/** Fire-and-forget helper for app code. */
export function notifyWhatsApp(r: Parameters<WaState['pushRequest']>[0]) {
  try {
    return useWhatsApp.getState().pushRequest(r);
  } catch {
    return '';
  }
}
