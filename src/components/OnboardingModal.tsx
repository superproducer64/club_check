import React, { useState } from 'react';
import { AppSettings, PlayingStyle, TargetPace } from '../types';
import { speakAlert } from '../utils/speech';
import { ShieldCheck, Navigation, Volume2, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  settings: AppSettings;
  onComplete: (updatedSettings: Partial<AppSettings>) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ settings, onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [playingStyle, setPlayingStyle] = useState<PlayingStyle>(settings.playingStyle);
  const [targetPace, setTargetPace] = useState<TargetPace>(settings.targetPace);
  const [gpsGranted, setGpsGranted] = useState<boolean>(false);
  const [audioTested, setAudioTested] = useState<boolean>(false);

  const requestGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsGranted(true);
        },
        (err) => {
          console.warn('GPS position error or denied', err);
          // Still allow user to proceed with simulation mode capability
          setGpsGranted(true);
        }
      );
    } else {
      setGpsGranted(true);
    }
  };

  const testAudioVoice = () => {
    speakAlert('Club Check.', {
      volume: settings.voiceVolume,
      pitch: settings.voicePitch,
      rate: settings.voiceRate,
      tone: settings.audioTone,
    });
    setAudioTested(true);
  };

  const handleFinish = () => {
    onComplete({
      onboardingCompleted: true,
      playingStyle,
      targetPace,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-emerald-950 text-emerald-50 rounded-2xl border border-emerald-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Step Indicator */}
        <div className="bg-emerald-900/60 px-6 py-4 border-b border-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-emerald-950 font-bold flex items-center justify-center text-sm shadow">
              CC
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">ClubCheck</span>
          </div>
          <div className="text-xs font-medium text-emerald-300 bg-emerald-900/80 px-2.5 py-1 rounded-full border border-emerald-700">
            Step {step} of 4
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-800/60 text-emerald-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Never leave a club behind.</h2>
              <p className="text-emerald-200/90 text-sm leading-relaxed">
                ClubCheck learns when you leave a green and delivers a simple, timely reminder before you drive or walk away.
              </p>
              
              <div className="bg-emerald-900/40 rounded-xl p-4 border border-emerald-800/80 space-y-3">
                <div className="flex items-start space-x-3 text-xs text-emerald-200">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Zero Hardware:</strong> No club sensors, no RFID tags, no expensive accessories.</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-emerald-200">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Zero Friction:</strong> Start your round once, put your phone away, and listen.</span>
                </div>
                <div className="flex items-start space-x-3 text-xs text-emerald-200">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>100% Private:</strong> GPS location and round data remain strictly on your device.</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white">Select Playing Style</h3>
                <p className="text-xs text-emerald-300 mt-1">Helps calibrate speed & green departure detection.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'riding', label: 'Riding Cart', desc: 'Fast cart exit speed (> 8 mph)', icon: '🏎️' },
                  { id: 'push_cart', label: 'Push Cart', desc: 'Moderate walking pace with cart', icon: '🛒' },
                  { id: 'walking', label: 'Walking / Carrying', desc: 'Steady walking departure pace', icon: '🚶' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPlayingStyle(item.id as PlayingStyle)}
                    className={`p-4 rounded-xl text-left transition-all flex items-center space-x-4 border ${
                      playingStyle === item.id
                        ? 'bg-emerald-500 text-emerald-950 font-semibold border-emerald-300 shadow-md scale-[1.02]'
                        : 'bg-emerald-900/30 text-emerald-100 border-emerald-800 hover:bg-emerald-900/50'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className={`text-xs ${playingStyle === item.id ? 'text-emerald-950/80' : 'text-emerald-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white">Typical Round Length</h3>
                <p className="text-xs text-emerald-300 mt-1">Used to estimate pace without keeping score.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: 'under_3h', label: 'Under 3 hours', sub: 'Fast 18 holes / Executive' },
                  { id: '3_5h', label: '3.5 hours', sub: 'Brisk pace (~11.5 min/hole)' },
                  { id: '4h', label: '4.0 hours', sub: 'Standard weekend pace (~13 min/hole)' },
                  { id: '4_5h', label: '4.5 hours', sub: 'Relaxed public course pace' },
                  { id: '5h_plus', label: '5+ hours', sub: 'Busy day / Group outing' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTargetPace(item.id as TargetPace)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                      targetPace === item.id
                        ? 'bg-emerald-500 text-emerald-950 border-emerald-300 font-bold'
                        : 'bg-emerald-900/30 text-emerald-100 border-emerald-800 hover:bg-emerald-900/50'
                    }`}
                  >
                    <div>
                      <div className="text-sm">{item.label}</div>
                      <div className={`text-xs ${targetPace === item.id ? 'text-emerald-950/80' : 'text-emerald-400'}`}>
                        {item.sub}
                      </div>
                    </div>
                    {targetPace === item.id && <CheckCircle2 className="w-5 h-5 text-emerald-950" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Enable Permissions & Audio</h3>
                <p className="text-xs text-emerald-300 mt-1">ClubCheck requires GPS location & voice speech.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Navigation className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">GPS Geolocation</div>
                      <div className="text-xs text-emerald-300">Detects green arrival and departure</div>
                    </div>
                  </div>
                  <button
                    onClick={requestGps}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      gpsGranted
                        ? 'bg-emerald-500 text-emerald-950'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {gpsGranted ? 'Active' : 'Enable'}
                  </button>
                </div>

                <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">Voice Reminder Test</div>
                      <div className="text-xs text-emerald-300">"Club Check." audio playback</div>
                    </div>
                  </div>
                  <button
                    onClick={testAudioVoice}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      audioTested
                        ? 'bg-emerald-500 text-emerald-950'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {audioTested ? 'Tested 🔊' : 'Test Voice'}
                  </button>
                </div>

                <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-800 flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">Simulator Included</div>
                    <div className="text-xs text-emerald-300">Includes live GPS & full indoor test simulator</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="bg-emerald-900/80 px-6 py-4 border-t border-emerald-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-xs font-semibold text-emerald-300 hover:text-white px-3 py-2 rounded-lg"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm px-5 py-2.5 rounded-xl shadow flex items-center space-x-2 transition"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 transition"
            >
              <span>Start Using ClubCheck</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
