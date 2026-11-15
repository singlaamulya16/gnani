import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BloodGroupGrid, Icon, Stepper, useToastStore, type BloodGroup } from '@/components/ui';
import { cn } from '@/lib/cn';
import { donorService } from '@/services/donorService';

const STEPS = ['Details', 'Blood group', 'Aadhaar', 'Live photo', 'Verify'];

const ELIGIBILITY = [
  'I am between 18 and 65 years old',
  'I weigh more than 45 kg',
  'I have not donated blood in the last 3 months',
  'I am not on antibiotics and have no fever today',
];

function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group inline-flex h-12 w-full items-center justify-between rounded-full bg-primary pl-6 pr-1.5 text-[15px] font-semibold text-white shadow-[var(--shadow-voice)] disabled:opacity-40"
    >
      {children}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary-dark">
        <Icon name="chevronRight" size={18} strokeWidth={2.5} />
      </span>
    </button>
  );
}

export function DonorRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState<BloodGroup>('O+');
  const [checks, setChecks] = useState<boolean[]>(ELIGIBILITY.map(() => false));
  const [aadhaarImg, setAadhaarImg] = useState<string | null>(null);
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  // live camera for selfie
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState('');
  const selfieInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 3 || selfie) return;
    let cancelled = false;
    setCamError('');
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => setCamError('Camera not available — upload a photo instead.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [step, selfie]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    setSelfie(c.toDataURL('image/jpeg', 0.8));
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  };

  const readFile = (file: File | undefined, set: (v: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => set(String(r.result));
    r.readAsDataURL(file);
  };

  const submit = async () => {
    await donorService.register({ firstName: name || 'Donor', bloodGroup: group, phone });
    push(t('donor.registered', 'You are registered as a donor'), 'success');
    navigate('/donor');
  };

  const field = 'h-12 w-full rounded-full border-2 border-border bg-surface px-5 text-[15px] outline-none focus:border-primary';

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div>
        <span className="eyebrow">Save lives near you</span>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight">
          Become a <span className="text-highlight">blood donor</span>
        </h1>
      </div>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-3">
          <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Mobile number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <PrimaryButton disabled={!name.trim()} onClick={() => setStep(1)}>Continue</PrimaryButton>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <BloodGroupGrid value={group} onChange={setGroup} />
          <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft/60 p-4">
            <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold">Quick eligibility check</p>
            <div className="mt-2 space-y-2">
              {ELIGIBILITY.map((e, i) => (
                <label key={e} className="flex cursor-pointer items-center gap-3 text-[14px]">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => setChecks((c) => c.map((x, j) => (j === i ? !x : x)))}
                    className="h-5 w-5 accent-[var(--color-primary)]"
                  />
                  {e}
                </label>
              ))}
            </div>
          </div>
          <PrimaryButton disabled={!checks.every(Boolean)} onClick={() => setStep(2)}>Continue</PrimaryButton>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[14px] text-text-secondary">
            Take a clear photo of the <b>front of your Aadhaar card</b>. We use it only to verify your identity.
          </p>
          <label
            className={cn(
              'relative flex h-52 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed text-center',
              aadhaarImg ? 'border-primary' : 'border-accent bg-accent-soft/50',
            )}
          >
            {aadhaarImg ? (
              <>
                <img src={aadhaarImg} alt="Aadhaar preview" className="absolute inset-0 h-full w-full object-cover blur-[2px]" />
                <span className="relative rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-white">Photo captured · tap to retake</span>
              </>
            ) : (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-accent">
                  <Icon name="shieldCheck" size={26} />
                </span>
                <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold">Click Aadhaar photo</span>
                <span className="text-[12.5px] text-text-secondary">Opens the camera on phones · upload on desktop</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => readFile(e.target.files?.[0], setAadhaarImg)}
            />
          </label>
          <input
            className={field}
            placeholder="Last 4 digits of Aadhaar (e.g. 4821)"
            inputMode="numeric"
            maxLength={4}
            value={aadhaarLast4}
            onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ''))}
          />
          <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-[12.5px] text-text-secondary">
            <Icon name="shieldCheck" size={16} className="mt-0.5 shrink-0 text-primary" />
            Demo: the photo stays on this device and is not uploaded. In production only a masked Aadhaar (XXXX XXXX {aadhaarLast4 || '____'}) is stored after DigiLocker verification.
          </p>
          <PrimaryButton disabled={!aadhaarImg || aadhaarLast4.length !== 4} onClick={() => setStep(3)}>Continue</PrimaryButton>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-[14px] text-text-secondary">
            Take a <b>live photo</b> so hospitals can recognise you when you arrive. Look straight at the camera.
          </p>
          <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-full border-4 border-accent bg-primary">
            {selfie ? (
              <img src={selfie} alt="Live selfie" className="h-full w-full object-cover" />
            ) : camError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-white">
                <Icon name="userRound" size={40} className="text-accent" />
                <span className="text-[13px]">{camError}</span>
              </div>
            ) : (
              <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
            )}
            {!selfie && !camError && (
              <span className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/60" />
            )}
          </div>
          <div className="flex justify-center gap-2">
            {selfie ? (
              <button type="button" onClick={() => setSelfie(null)} className="h-11 rounded-full border-2 border-primary px-5 text-[14px] font-semibold text-primary">
                Retake
              </button>
            ) : camError ? (
              <button type="button" onClick={() => selfieInput.current?.click()} className="h-11 rounded-full bg-primary px-5 text-[14px] font-semibold text-white">
                Upload photo
              </button>
            ) : (
              <button type="button" onClick={snap} className="inline-flex h-12 items-center gap-2 rounded-full bg-sos px-6 text-[15px] font-bold text-white shadow-[var(--shadow-sos)]">
                <span className="h-3 w-3 rounded-full bg-white" /> Capture live photo
              </button>
            )}
            <input ref={selfieInput} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => readFile(e.target.files?.[0], setSelfie)} />
          </div>
          <PrimaryButton disabled={!selfie} onClick={() => setStep(4)}>Continue</PrimaryButton>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            {selfie && <img src={selfie} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-accent" />}
            <div>
              <p className="font-[family-name:var(--font-display)] text-[17px] font-semibold">{name || 'Donor'} · {group}</p>
              <p className="text-[13px] text-text-secondary">
                {phone || 'No phone'} · Aadhaar XXXX XXXX {aadhaarLast4}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-success/15 px-3 py-1 text-[12px] font-semibold text-success">ID + photo ready</span>
          </div>
          <p className="text-[13.5px] text-text-secondary">Enter the 4-digit OTP sent to your phone (demo: any 4 digits).</p>
          <input
            className="h-14 w-full rounded-2xl border-2 border-accent bg-surface text-center text-[24px] font-bold tracking-[0.6em] outline-none focus:border-primary"
            placeholder="••••"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
          />
          <PrimaryButton disabled={otp.length !== 4} onClick={() => void submit()}>Verify & register</PrimaryButton>
        </div>
      )}

      {step > 0 && (
        <button type="button" onClick={() => setStep(step - 1)} className="self-start text-[13px] font-semibold text-text-secondary hover:text-text">
          ← Back
        </button>
      )}
    </div>
  );
}
