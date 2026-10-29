import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface SettingsState {
  voiceEnabled: boolean;
  voiceSelection: string;
  voiceVolume: number;
  reminderDelaySec: number;
  reminderDistanceM: number;
  gpsAccuracy: 'high' | 'balanced' | 'low_power';
  darkMode: boolean;
  units: 'imperial' | 'metric';
  alertMode: 'voice' | 'tone' | 'vibration' | 'silent';
  playingStyle: 'riding' | 'push_cart' | 'walking';

  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  hydrate: () => void;
}

const defaults = {
  voiceEnabled: true,
  voiceSelection: 'default',
  voiceVolume: 0.8,
  reminderDelaySec: 4.0,
  reminderDistanceM: 15.0,
  gpsAccuracy: 'balanced' as const,
  darkMode: false,
  units: 'imperial' as const,
  alertMode: 'voice' as const,
  playingStyle: 'walking' as 'riding' | 'push_cart' | 'walking',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...defaults,

  updateSetting: (key, value) => {
    storage.set(key, JSON.stringify(value));
    set({ [key]: value } as any);
  },

  hydrate: () => {
    const loaded: any = {};
    for (const key of Object.keys(defaults)) {
      const raw = storage.getString(key);
      if (raw) loaded[key] = JSON.parse(raw);
    }
    set(loaded);
  },
}));
