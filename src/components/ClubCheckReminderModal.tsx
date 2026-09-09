import React, { useEffect, useState } from 'react';
import { AppSettings } from '../types';
import { speakAlert } from '../utils/speech';
import { Volume2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ClubCheckReminderModalProps {
  holeNumber: number;
  settings: AppSettings;
  onConfirm: (retrievedClub: boolean) => void;
}

const AUTO_DISMISS_SECONDS = 12;

export const ClubCheckReminderModal: React.FC<ClubCheckReminderModalProps> = ({ holeNumber, settings, onConfirm }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(AUTO_DISMISS_SECONDS);

  const playVoiceAlert = () => {
    speakAlert(settings.voicePhrase, {
      volume: settings.voiceVolume,
      pitch: settings.voicePitch,
      rate: settings.voiceRate,
      tone: settings.audioTone,
      haptic: settings.hapticEnabled,
    });
  };

  // Play voice prompt on mount and start the auto-dismiss countdown
  useEffect(() => {
    playVoiceAlert();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirm(false); // Default confirm on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeNumber]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950 text-white rounded-3xl border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden flex flex-col p-6 space-y-6 text-center relative">
        {/* Animated beacon ring */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center animate-bounce shadow-lg">
          <div className="w-14 h-14 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xl shadow-inner">
            ⛳
          </div>
        </div>

        {/* Large voice alert headline */}
        <div className="space-y-2">
          <div className="inline-block bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/40">
            Hole {holeNumber} Green Departure
          </div>
          <h1 className="text-3xl font-extrabold text-amber-300 tracking-tight drop-shadow">"{settings.voicePhrase}"</h1>
          <p className="text-stone-300 text-xs max-w-xs mx-auto">
            Take a quick look around the green fringe before driving or walking away.
          </p>
        </div>

        {/* Replay sound button */}
        <div className="flex justify-center">
          <button
            onClick={playVoiceAlert}
            className="bg-stone-800/80 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-stone-700 transition"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Replay Voice Alert</span>
          </button>
        </div>

        {/* Signature action buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => onConfirm(false)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black text-base py-4 rounded-2xl shadow-xl border-2 border-emerald-300 flex items-center justify-center space-x-2 transition-all"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-950" />
            <span>All Clubs Accounted For</span>
          </button>

          <button
            onClick={() => onConfirm(true)}
            className="w-full bg-amber-900/60 hover:bg-amber-800/80 active:scale-[0.98] text-amber-200 border border-amber-600/80 font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Almost Left One! (Saved a Club)</span>
          </button>
        </div>

        {/* Auto dismiss progress footer */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calibrating timing...</span>
          </div>
          <div>Auto-dismissing in {secondsRemaining}s</div>
        </div>
      </div>
    </div>
  );
};
