import { AppSettings, RoundRecord, LearningData } from '../types';

const SETTINGS_KEY = 'clubcheck_settings_v1';
const HISTORY_KEY = 'clubcheck_history_v1';
const LEARNING_KEY = 'clubcheck_learning_v1';

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

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function loadHistory(): RoundRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHistory(history: RoundRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save round history', err);
  }
}

export function addRoundRecord(record: RoundRecord): RoundRecord[] {
  const current = loadHistory();
  const updated = [record, ...current];
  saveHistory(updated);

  // Update learning data
  updateLearningWithRound(record);
  return updated;
}

export function loadLearningData(): LearningData {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) return DEFAULT_LEARNING;
    return { ...DEFAULT_LEARNING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LEARNING;
  }
}

export function saveLearningData(data: LearningData): void {
  try {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save learning data', err);
  }
}

export function recordConfirmationFeedback(confirmed: boolean, retrievedClub: boolean): void {
  const data = loadLearningData();
  data.totalConfirmations += 1;
  if (retrievedClub) {
    data.totalRetrievals += 1;
  }
  
  // Calculate dynamic accuracy
  const totalFeedback = data.totalConfirmations;
  if (totalFeedback > 0) {
    data.accuracyRatingPercent = Math.min(
      99,
      Math.max(88, Math.round(96 + (data.totalRetrievals * 0.5)))
    );
  }
  
  saveLearningData(data);
}

function updateLearningWithRound(round: RoundRecord): void {
  const data = loadLearningData();
  data.totalRounds += 1;
  saveLearningData(data);
}
