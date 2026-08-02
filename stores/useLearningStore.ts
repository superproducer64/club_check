import { create } from 'zustand';

interface LearningState {
  avgHoleDurationSec: number | null;
  avgGreenDwellSec: number | null;
  avgWalkingSpeedMps: number | null;
  avgCartSpeedMps: number | null;
  reminderDelaySec: number;
  reminderDistanceM: number;
  roundsCompleted: number;
  confirmationRate: number | null;

  loadFromDb: (stats: Partial<LearningState>) => void;
  recalibrate: (newDelay: number, newDistance: number) => void;
  resetLearning: () => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  avgHoleDurationSec: null,
  avgGreenDwellSec: null,
  avgWalkingSpeedMps: null,
  avgCartSpeedMps: null,
  reminderDelaySec: 4.0,
  reminderDistanceM: 15.0,
  roundsCompleted: 0,
  confirmationRate: null,

  loadFromDb: (stats) => set(stats),

  recalibrate: (newDelay, newDistance) =>
    set({
      reminderDelaySec: newDelay,
      reminderDistanceM: newDistance,
    }),

  resetLearning: () =>
    set({
      avgHoleDurationSec: null,
      avgGreenDwellSec: null,
      avgWalkingSpeedMps: null,
      avgCartSpeedMps: null,
      reminderDelaySec: 4.0,
      reminderDistanceM: 15.0,
      roundsCompleted: 0,
      confirmationRate: null,
    }),
}));
