import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { voiceService, type VoiceResult } from '@/services/voice/voiceService';
import { useAppStore } from '@/store/appStore';

/**
 * One voice loop for the whole app:
 * mic -> Gnani Prisma (STT) -> intent -> app actions (map filter / navigate) -> Gnani Timbre (TTS)
 */
export function useVoiceCommand() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const voiceState = useAppStore((s) => s.voiceState);
  const setVoiceState = useAppStore((s) => s.setVoiceState);
  const setVoiceCopy = useAppStore((s) => s.setVoiceCopy);
  const setActiveFilters = useAppStore((s) => s.setActiveFilters);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const act = useCallback(
    (result: VoiceResult) => {
      for (const tool of result.tools) {
        switch (tool.name) {
          case 'findPlaces': {
            const kind = tool.args.kind;
            if (kind === 'hospital') {
              setActiveFilters(['hospital']);
              navigate('/hospitals');
            } else if (kind === 'doctor' || kind === 'clinic') {
              setActiveFilters(['doctor', 'clinic']);
              navigate('/doctors');
            } else if (kind === 'pharmacy') {
              setActiveFilters(['pharmacy']);
              navigate('/pharmacy');
            }
            break;
          }
          case 'findBlood': {
            setActiveFilters(['blood_bank', 'donor']);
            const q = new URLSearchParams();
            if (tool.args.group) q.set('group', tool.args.group);
            if (tool.args.units) q.set('units', tool.args.units);
            navigate(`/blood${q.toString() ? `?${q}` : ''}`);
            break;
          }
          case 'requestAmbulance':
            navigate('/ambulance');
            break;
          case 'sendAlert':
            navigate('/sos');
            break;
          case 'switchLanguage':
            if (tool.args.lang) setLanguage(tool.args.lang);
            break;
        }
      }
    },
    [navigate, setActiveFilters, setLanguage],
  );

  const runTranscript = useCallback(
    async (text: string) => {
      setVoiceState('understanding');
      const result = voiceService.interpret(text, i18n.language);
      setVoiceCopy(result.transcript, result.reply);
      act(result);
      setVoiceState('speaking');
      await voiceService.speak(result.reply, result.replyLang);
      setVoiceState('idle');
    },
    [act, i18n.language, setVoiceCopy, setVoiceState],
  );

  /** Tap once to talk (auto-stops on silence); tap again to stop early. */
  const toggleListen = useCallback(async () => {
    if (voiceService.isListening()) {
      voiceService.stopListening();
      return;
    }
    if (voiceState === 'understanding' || voiceState === 'speaking') return;
    try {
      setVoiceState('listening');
      const text = await voiceService.startListening(i18n.language);
      await runTranscript(text);
    } catch (err) {
      console.warn('[voice]', err);
      setVoiceState('error');
      setVoiceCopy('', t('voice.error'));
      window.setTimeout(() => setVoiceState('idle'), 1800);
    }
  }, [i18n.language, runTranscript, setVoiceCopy, setVoiceState, t, voiceState]);

  return { voiceState, toggleListen, runTranscript };
}
