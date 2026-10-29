import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

interface HoleProgress {
  holeNumber: number;
  arrivedGreenAt: number | null;
  leftGreenAt: number | null;
}

interface RoundState {
  activeRoundId: string | null;
  courseId: string | null;
  courseName: string | null;
  playingStyle: 'riding' | 'push_cart' | 'walking' | null;
  startedAt: number | null;
  currentHole: number;
  holeProgress: HoleProgress[];
  gpsStatus: 'active' | 'searching' | 'lost';
  backgroundMonitoringActive: boolean;

  startRound: (courseId: string, courseName: string, playingStyle: RoundState['playingStyle']) => void;
  endRound: () => void;
  advanceHole: () => void;
  markGreenArrival: () => void;
  markGreenDeparture: () => void;
  setGpsStatus: (status: RoundState['gpsStatus']) => void;
}

export const useRoundStore = create<RoundState>((set, get) => ({
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
      backgroundMonitoringActive: false,
    }),

  advanceHole: () => set((state) => ({ currentHole: state.currentHole + 1 })),

  markGreenArrival: () =>
    set((state) => ({
      holeProgress: [
        ...state.holeProgress,
        {
          holeNumber: state.currentHole,
          arrivedGreenAt: Date.now(),
          leftGreenAt: null,
        },
      ],
    })),

  markGreenDeparture: () =>
    set((state) => ({
      holeProgress: state.holeProgress.map((h) =>
        h.holeNumber === state.currentHole ? { ...h, leftGreenAt: Date.now() } : h
      ),
    })),

  setGpsStatus: (status) => set({ gpsStatus: status }),
}));
