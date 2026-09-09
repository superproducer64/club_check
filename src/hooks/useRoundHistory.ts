import { RoundRecord } from '../types';
import { usePersistedState } from './usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';

export function useRoundHistory() {
  const [history, setHistory] = usePersistedState<RoundRecord[]>(STORAGE_KEYS.history, []);

  const addRound = (record: RoundRecord) => {
    setHistory((prev) => [record, ...prev]);
  };

  const clearHistory = () => setHistory([]);

  return { history, addRound, clearHistory };
}
