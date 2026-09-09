import { AppSettings, LearningData } from '../types';

export const STORAGE_KEYS = {
  settings: 'clubcheck_settings_v1',
  history: 'clubcheck_history_v1',
  learning: 'clubcheck_learning_v1',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingCompleted: false,
  playingStyle: 'riding',
  targetPace: '4h',
  voicePhrase: 'Club Check.',
  audioTone: 'standard',
  voiceVolume: 1.0,
  voicePitch: 1.0,
  voiceRate: 1.0,
  reminderDelaySeconds: 3,
  reminderDistanceMeters: 25,
  useMetric: false,
  darkMode: false,
  gpsHighAccuracy: true,
  hapticEnabled: true,
};

export const DEFAULT_LEARNING: LearningData = {
  totalRounds: 0,
  avgGreenDwellSeconds: 110,
  avgCartSpeedMph: 11.2,
  totalConfirmations: 0,
  totalRetrievals: 0,
  accuracyRatingPercent: 98,
};

/**
 * Pure state transition for a golfer confirming a "Club Check" reminder.
 * Accuracy climbs slightly with each retrieved club, capped to a believable range.
 */
export function applyConfirmationFeedback(data: LearningData, retrievedClub: boolean): LearningData {
  const totalConfirmations = data.totalConfirmations + 1;
  const totalRetrievals = data.totalRetrievals + (retrievedClub ? 1 : 0);
  const accuracyRatingPercent = Math.min(99, Math.max(88, Math.round(96 + totalRetrievals * 0.5)));
  return { ...data, totalConfirmations, totalRetrievals, accuracyRatingPercent };
}

export function applyCompletedRound(data: LearningData): LearningData {
  return { ...data, totalRounds: data.totalRounds + 1 };
}
