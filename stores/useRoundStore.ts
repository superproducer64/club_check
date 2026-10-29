import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

export type PlayingStyle = 'riding' | 'push_cart' | 'walking';

interface HoleProgress {
  holeNumber: number;
  arrivedGreenAt: number | null;
  leftGreenAt: number | null;
}

interface RoundState {
  activeRoundId: string | null;
  courseId: string | null;
  courseName: string | null;
  playingStyle: PlayingStyle | null;
  startedAt: number | null;
  currentHole: number;
  holeProgress: HoleProgress[];
  gpsStatus: 'active' | 'searching' | 'lost';
  backgroundMonitoringActive: boolean;

  startRound: (courseId: string, courseName: string, playingStyle: PlayingStyle) => void;
  endRound: () => void;
  setCurrentHole: (hole: number) => void;
  recordGreenVisit: (holeNumber: number, arrivedAt: number, leftAt: number) => void;
  setGpsStatus: (status: RoundState['gpsStatus']) => void;
}

const mmkv = new MMKV({ id: 'round-session' });
const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => mmkv.delete(name),
};

/**
 * Persisted to MMKV so an in-progress round survives the app being closed or
 * relaunched in the background by the OS. gpsStatus is runtime-only.
 */
export const useRoundStore = create<RoundState>()(
  persist(
    (set) => ({
      activeRoundId: null,
      courseId: null,
      courseName: null,
      playingStyle: null,
      startedAt: null,
      currentHole: 1,
      holeProgress: [],
      gpsStatus: 'searching',
      backgroundMonitoringActive: false,

      startRound: (courseId, courseName, playingStyle) =>
        set({
          activeRoundId: Crypto.randomUUID(),
          courseId,
          courseName,
          playingStyle,
          startedAt: Date.now(),
          currentHole: 1,
          holeProgress: [],
          backgroundMonitoringActive: true,
        }),

      endRound: () =>
        set({
          activeRoundId: null,
          courseId: null,
          courseName: null,
          playingStyle: null,
          startedAt: null,
          currentHole: 1,
          holeProgress: [],
          backgroundMonitoringActive: false,
          gpsStatus: 'searching',
        }),

      setCurrentHole: (hole) => set({ currentHole: Math.max(1, hole) }),

      recordGreenVisit: (holeNumber, arrivedAt, leftAt) =>
        set((state) => ({
          holeProgress: [
            ...state.holeProgress.filter((h) => h.holeNumber !== holeNumber),
            { holeNumber, arrivedGreenAt: arrivedAt, leftGreenAt: leftAt },
          ],
        })),

      setGpsStatus: (status) => set({ gpsStatus: status }),
    }),
    {
      name: 'active-round',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: ({ gpsStatus: _gps, ...rest }) => rest,
    }
  )
);
