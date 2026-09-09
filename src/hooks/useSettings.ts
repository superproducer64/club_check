import { AppSettings } from '../types';
import { usePersistedState } from './usePersistedState';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/storage';

export function useSettings() {
  const [settings, setSettings] = usePersistedState<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return { settings, updateSettings };
}
