import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useWhatsApp, type WaChannel, type WaMsg, type WaRequest } from '@/services/demoWhatsApp';

const WA_DARK = '#075E54';
const WA_GREEN = '#25D366';

const fmt = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, req, channel }: { m: WaMsg; req?: WaRequest; channel: WaChannel }) {
  const accept = useWhatsApp((s) => s.accept);
  const reject = useWhatsApp((s) => s.reject);
  const mine = m.from === 'me';

  if (m.kind === 'location' && req) {
    const pct = req.startKm ? Math.min(100, Math.round(((req.startKm - req.distanceKm) / req.startKm) * 100)) : 100;
    const done = req.status === 'arrived' || req.status === 'started';
    return (
      <div className={cn('flex', channel === 'partner' ? 'justify-end' : 'justify-start')}>
        <div className="w-[85%] overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="relative h-28 bg-[#e6efe3]" style={{ backgroundImage: 'repeating-linear-gradient(35deg, #d9e6d4 0 2px, transparent 2px 22px), repeating-linear-gradient(-55deg, #f3e9c8 0 6px, transparent 6px 46px)' }}>
            <div className="absolute left-[12%] right-[12%] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#34b7f1]/40" />
            <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#34b7f1]" style={{ left: '12%', width: `${(76 * pct) / 100}%` }} />
            <span className="absolute right-[10%] top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-sos text-white shadow">
              <Icon name="mapPin" size={14} />
            </span>
            <span
              className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#075E54] text-white shadow transition-all duration-700"
              style={{ left: `${12 + (76 * pct) / 100}%` }}
            >
              <Icon name={req.type === 'blood' ? 'droplet' : 'ambulance'} size={14} />
            </span>
            {!done && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-bold text-[#075E54]">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#25D366]" /> LIVE
              </span>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-[13.5px] font-semibold text-[#111b21]">
              {channel === 'user' ? `${req.partner} is on the way` : 'Your live location is shared'}
            </p>
            <p className="text-[12.5px] text-[#667781]">
              {done ? 'Arrived' : `${req.distanceKm.toFixed(1)} km away · ETA ${req.etaMin} min`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (m.kind === 'request' && req) {
    return (
      <div className="flex justify-start">
        <div className="w-[88%] rounded-xl rounded-tl-none bg-white p-3 shadow-sm">
          <p className={cn('text-[12px] font-bold uppercase tracking-wide', req.type === 'blood' ? 'text-[#d93025]' : 'text-[#c26401]')}>
            {req.type === 'blood' ? 'Blood request' : 'Ambulance request'}
          </p>
          <p className="mt-1 whitespace-pre-line text-[13.5px] text-[#111b21]">{m.text}</p>
          {req.status === 'pending' ? (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => reject(req.id)} className="h-9 rounded-lg border border-[#d93025]/40 text-[13.5px] font-semibold text-[#d93025] hover:bg-[#d93025]/5">
                Reject
              </button>
              <button type="button" onClick={() => accept(req.id)} className="h-9 rounded-lg text-[13.5px] font-semibold text-white" style={{ background: WA_GREEN }}>
                Accept
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[12px] font-semibold text-[#667781]">
              {req.status === 'rejected' ? 'You rejected this request' : `Accepted · ${req.status === 'started' ? 'started' : req.status === 'arrived' ? 'arrived' : 'on the way'}`}
            </p>
          )}
          <p className="mt-1 text-right text-[10.5px] text-[#667781]">{fmt(m.time)}</p>
        </div>
      </div>
    );
  }

  const codeMatch = m.kind === 'code' ? m.text.match(/(\d{4})/) : null;
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn('max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] shadow-sm', mine ? 'rounded-tr-none' : 'rounded-tl-none')}
        style={{ background: mine ? '#d9fdd3' : '#fff' }}
      >
        <p className="whitespace-pre-line text-[#111b21]">{m.text}</p>
        {codeMatch && (
          <p className="mt-1.5 rounded-lg bg-[#075E54] py-1.5 text-center font-mono text-[22px] font-bold tracking-[0.4em] text-white">{codeMatch[1]}</p>
        )}
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781]">
          {fmt(m.time)}
          {mine && <Icon name="check" size={12} className="text-[#53bdeb]" />}
        </p>
      </div>
    </div>
  );
}

function Phone({ channel }: { channel: WaChannel }) {
  const messages = useWhatsApp((s) => s.messages);
  const requests = useWhatsApp((s) => s.requests);
  const verifyCode = useWhatsApp((s) => s.verifyCode);
  const list = useMemo(() => messages.filter((m) => m.channel === channel), [messages, channel]);
  const end = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState('');
  const arrived = requests.find((r) => r.status === 'arrived');
  const latest = requests[0];

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [list.length, requests]);

  const title = channel === 'user' ? 'HelpMe Alerts' : latest?.partner ?? 'Donor / Ambulance';
  const sub = channel === 'user' ? 'For: Rahul (patient family)' : latest ? (latest.type === 'blood' ? 'Registered blood donor' : 'Ambulance driver app') : 'Waiting for requests';

  return (
    <div className="flex h-[680px] w-full max-w-[380px] flex-col overflow-hidden rounded-[38px] border-[10px] border-[#1f2c34] bg-[#1f2c34] shadow-[var(--shadow-float)]">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4 text-white" style={{ background: WA_DARK }}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Icon name={channel === 'user' ? 'heartPulse' : latest?.type === 'ambulance' ? 'ambulance' : 'droplet'} size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] font-semibold">{title}</span>
          <span className="block truncate text-[12px] text-white/70">{sub}</span>
        </span>
        <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-bold">{channel === 'user' ? 'USER' : 'DONOR / SERVICE'}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" style={{ background: '#efeae2' }}>
        <p className="mx-auto w-fit rounded-lg bg-[#fff5c4] px-3 py-1 text-center text-[11.5px] text-[#54656f]">
          Demo chat · simulated WhatsApp messages
        </p>
        {list.length === 0 && (
          <p className="mt-10 text-center text-[13px] text-[#667781]">
            No messages yet. Create a blood or ambulance request in HelpMe (or use the buttons above).
          </p>
        )}
        {list.map((m) => (
          <Bubble key={m.id} m={m} channel={channel} req={requests.find((r) => r.id === m.requestId)} />
        ))}
        <div ref={end} />
      </div>
      <div className="flex items-center gap-2 px-2 py-2" style={{ background: '#f0f2f5' }}>
        {channel === 'partner' && arrived ? (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter start code from family"
              className="h-10 flex-1 rounded-full bg-white px-4 text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (code.length === 4) {
                  verifyCode(arrived.id, code);
                  setCode('');
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ background: WA_GREEN }}
            >
              <Icon name="check" size={18} strokeWidth={3} />
            </button>
          </>
        ) : (
          <>
            <span className="h-10 flex-1 rounded-full bg-white px-4 text-[14px] leading-10 text-[#8696a0]">Message</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: WA_GREEN }}>
              <Icon name="mic" size={18} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function WhatsAppPage() {
  const pushRequest = useWhatsApp((s) => s.pushRequest);
  const reset = useWhatsApp((s) => s.reset);
  const requests = useWhatsApp((s) => s.requests);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Live notifications (demo)</span>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-tight">
            WhatsApp <span className="text-highlight">alerts</span>
          </h1>
          <p className="mt-1 max-w-xl text-[14px] text-text-secondary">
            Every HelpMe request is pushed here. The donor or ambulance accepts or rejects, a start code is shared, and live
            location updates until arrival. Open this page in a second window next to the app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pushRequest({ type: 'blood', title: 'B+ blood · 2 units', detail: 'Saroj Hospital, Rohini · Patient: Sunita (54)' })}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-sos px-4 text-[13.5px] font-semibold text-white"
          >
            <Icon name="droplet" size={16} /> Simulate blood request
          </button>
          <button
            type="button"
            onClick={() => pushRequest({ type: 'ambulance', title: 'Accident · patient conscious', detail: 'Pickup: Sector 14, Rohini, Delhi' })}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-white"
          >
            <Icon name="ambulance" size={16} /> Simulate ambulance
          </button>
          <button type="button" onClick={reset} className="h-11 rounded-full border border-border px-4 text-[13.5px] font-semibold text-text-secondary">
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 justify-items-center gap-8 md:grid-cols-2">
        <div className="flex w-full flex-col items-center gap-2">
          <span className="rounded-full bg-primary px-4 py-1 text-[12.5px] font-semibold text-white">User · person who asked for help</span>
          <Phone channel="user" />
        </div>
        <div className="flex w-full flex-col items-center gap-2">
          <span className="rounded-full bg-accent px-4 py-1 text-[12.5px] font-semibold text-on-accent">Donor / Service · accepts the request</span>
          <Phone channel="partner" />
        </div>
      </div>

      {requests.length > 0 && (
        <p className="mt-6 text-center text-[12.5px] text-text-secondary">
          {requests.length} request{requests.length === 1 ? '' : 's'} in this demo · latest status: <b>{requests[0]!.status}</b>
        </p>
      )}
    </div>
  );
}
