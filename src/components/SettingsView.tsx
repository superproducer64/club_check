import React, { useState } from 'react';
import { AppSettings, PlayingStyle, VoicePhrase, AudioTone, LearningData } from '../types';
import { speakAlert } from '../utils/speech';
import { Settings, Volume2, Cpu, Sliders, Gauge, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  learningData: LearningData;
  onResetLearning: () => void;
}

const VOICE_PHRASES: VoicePhrase[] = [
  'Club Check.',
  'Did you grab all your clubs?',
  'Quick club check.',
  'Before you drive away, check your clubs.',
];

const AUDIO_TONES: { id: AudioTone; label: string }[] = [
  { id: 'standard', label: 'Voice Only' },
  { id: 'voice_and_chime', label: 'Voice + Chime 🔔' },
  { id: 'chime_only', label: 'Chime Only' },
  { id: 'vibrate_only', label: 'Vibration Only 📳' },
];

const REMINDER_DISTANCES = [15, 25, 35];
const REMINDER_DELAYS = [3, 5, 8];

const PLAYING_STYLES: { id: PlayingStyle; label: string }[] = [
  { id: 'riding', label: '🏎️ Riding Cart' },
  { id: 'push_cart', label: '🛒 Push Cart' },
  { id: 'walking', label: '🚶 Walking' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, learningData, onResetLearning }) => {
  const [testPlaying, setTestPlaying] = useState<boolean>(false);

  const handleTestVoice = () => {
    setTestPlaying(true);
    speakAlert(settings.voicePhrase, {
      volume: settings.voiceVolume,
      pitch: settings.voicePitch,
      rate: settings.voiceRate,
      tone: settings.audioTone,
      haptic: settings.hapticEnabled,
    }).then(() => setTestPlaying(false));
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5 text-stone-100 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>App Settings</span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">Customize voice prompts, departure sensitivity, and audio alerts.</p>
      </div>

      {/* Voice prompt & audio tone controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm text-white">Voice Announcement</span>
          </div>

          <button
            onClick={handleTestVoice}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              testPlaying ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow'
            }`}
          >
            <span>{testPlaying ? 'Playing... 🔊' : 'Test Voice 🔊'}</span>
          </button>
        </div>

        {/* Voice phrase selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-300">Default Voice Phrase</label>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {VOICE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => onUpdateSettings({ voicePhrase: phrase })}
                className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                  settings.voicePhrase === phrase
                    ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                    : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800/60'
                }`}
              >
                <span>"{phrase}"</span>
                {settings.voicePhrase === phrase && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Audio tone type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-300">Alert Mode</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {AUDIO_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => onUpdateSettings({ audioTone: tone.id })}
                className={`p-2 rounded-xl text-center border font-semibold text-xs transition ${
                  settings.audioTone === tone.id
                    ? 'bg-emerald-950 border-emerald-500 text-white'
                    : 'bg-stone-950 text-stone-400 border-stone-800 hover:bg-stone-800'
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume & rate sliders */}
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1">
              <span>Voice Volume</span>
              <span className="font-bold">{Math.round(settings.voiceVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.voiceVolume}
              onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1.5 bg-stone-950 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1">
              <span>Speech Speed / Rate</span>
              <span className="font-bold">{settings.voiceRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={settings.voiceRate}
              onChange={(e) => onUpdateSettings({ voiceRate: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 h-1.5 bg-stone-950 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Reminder delay & distance thresholds */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center space-x-2 border-b border-stone-800/80 pb-3">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-white">Departure Sensitivity</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1.5">
              <span>Reminder Distance Threshold</span>
              <span className="font-bold text-emerald-400">
                {settings.reminderDistanceMeters} meters (~{Math.round(settings.reminderDistanceMeters * 3.28)} ft)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {REMINDER_DISTANCES.map((dist) => (
                <button
                  key={dist}
                  onClick={() => onUpdateSettings({ reminderDistanceMeters: dist })}
                  className={`py-2 rounded-xl border font-bold transition ${
                    settings.reminderDistanceMeters === dist
                      ? 'bg-emerald-950 border-emerald-500 text-white'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  {dist}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-300 mb-1.5">
              <span>Trigger Buffer Delay</span>
              <span className="font-bold text-emerald-400">{settings.reminderDelaySeconds} seconds</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {REMINDER_DELAYS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => onUpdateSettings({ reminderDelaySeconds: sec })}
                  className={`py-2 rounded-xl border font-bold transition ${
                    settings.reminderDelaySeconds === sec
                      ? 'bg-emerald-950 border-emerald-500 text-white'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  {sec}s Delay
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Playing style calibration */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-2 border-b border-stone-800/80 pb-3">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-white">Playing Style</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {PLAYING_STYLES.map((item) => (
            <button
              key={item.id}
              onClick={() => onUpdateSettings({ playingStyle: item.id })}
              className={`p-2.5 rounded-xl border font-semibold text-center transition ${
                settings.playingStyle === item.id
                  ? 'bg-emerald-950 border-emerald-500 text-white font-bold'
                  : 'bg-stone-950 text-stone-400 border-stone-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Adaptive learning telemetry */}
      <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm text-white">Adaptive Learning Telemetry</span>
          </div>

          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {learningData.accuracyRatingPercent}% Accuracy
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <div className="text-[10px] text-stone-400">Total Confirmations</div>
            <div className="text-base font-bold text-white mt-0.5">{learningData.totalConfirmations}</div>
          </div>
          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <div className="text-[10px] text-stone-400">Clubs Retrieved</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{learningData.totalRetrievals}</div>
          </div>
        </div>

        <button
          onClick={onResetLearning}
          className="w-full bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Learning Calibration</span>
        </button>
      </div>
    </div>
  );
};
