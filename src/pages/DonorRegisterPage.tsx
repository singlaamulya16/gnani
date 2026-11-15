import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BloodGroupGrid,
  Button,
  EmergencyBanner,
  Stepper,
  useToastStore,
  type BloodGroup,
} from '@/components/ui';
import { donorService } from '@/services/donorService';

export function DonorRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState<BloodGroup>('O+');
  const [otp, setOtp] = useState('');

  const submit = async () => {
    await donorService.register({ firstName: name || 'Donor', bloodGroup: group, phone });
    push(t('donor.registered'), 'success');
    navigate('/donor');
  };

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">
        {t('pages.donorRegister')}
      </h1>
      <EmergencyBanner />
      <Stepper
        steps={[t('donor.stepInfo'), t('donor.stepBlood'), t('donor.stepOtp')]}
        current={step}
      />
      {step === 0 && (
        <div className="space-y-3">
          <input
            className="h-10 w-full rounded-[var(--radius-lg)] bg-surface-low px-4"
            placeholder={t('donor.firstName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="h-10 w-full rounded-[var(--radius-lg)] bg-surface-low px-4"
            placeholder={t('donor.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button fullWidth onClick={() => setStep(1)}>
            {t('common.continue')}
          </Button>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          <BloodGroupGrid value={group} onChange={setGroup} />
          <Button fullWidth onClick={() => setStep(2)}>
            {t('common.continue')}
          </Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-[12px] text-text-secondary">{t('donor.otpHint')}</p>
          <input
            className="h-10 w-full rounded-[var(--radius-lg)] bg-surface-low px-3 text-center text-sm font-bold tracking-[0.4em]"
            placeholder="1234"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={4}
          />
          <Button fullWidth onClick={() => void submit()}>
            {t('donor.verify')}
          </Button>
        </div>
      )}
    </div>
  );
}
