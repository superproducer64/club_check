export type PlayingStyle = 'riding' | 'push_cart' | 'walking';

export type TargetPace = 'under_3h' | '3_5h' | '4h' | '4_5h' | '5h_plus';

export type VoicePhrase =
  | 'Club Check.'
  | 'Did you grab all your clubs?'
  | 'Quick club check.'
  | 'Before you drive away, check your clubs.';

export type AudioTone = 'standard' | 'chime_only' | 'voice_and_chime' | 'vibrate_only' | 'silent';

export interface HoleGPS {
  holeNumber: number;
  par: number;
  handicap: number;
  yardage: number;
  greenLat: number;
  greenLng: number;
  teeLat: number;
  teeLng: number;
}

export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
  holesCount: number;
  parTotal: number;
  totalYards: number;
  rating?: number;
  holes: HoleGPS[];
  distanceKm?: number;
  isLiveFetched?: boolean;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  speed: number | null; // in m/s
  heading: number | null;
  timestamp: number;
}

export type DepartureState = 'APPROACHING' | 'ON_GREEN' | 'DEPARTING' | 'CLEAR';

export interface ReminderEvent {
  id: string;
  holeNumber: number;
  timestamp: number;
  confirmed: boolean; // True if 'All Clubs Accounted For' was clicked
  neededClubRetrieval?: boolean;
  latitude: number;
  longitude: number;
  speedMph: number;
  dwellTimeSeconds: number;
}

export interface RoundRecord {
  id: string;
  courseId: string;
  courseName: string;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
  playingStyle: PlayingStyle;
  holesCompleted: number;
  totalReminders: number;
  clubsSavedCount: number;
  missedRemindersCount: number;
  reminderEvents: ReminderEvent[];
  notes?: string;
}

export interface AppSettings {
  onboardingCompleted: boolean;
  playingStyle: PlayingStyle;
  targetPace: TargetPace;
  voicePhrase: VoicePhrase;
  audioTone: AudioTone;
  voiceVolume: number; // 0.0 to 1.0
  voicePitch: number; // 0.5 to 1.5
  voiceRate: number; // 0.5 to 1.5
  reminderDelaySeconds: number; // default 3 to 5s
  reminderDistanceMeters: number; // default 25m
  useMetric: boolean;
  darkMode: boolean;
  gpsHighAccuracy: boolean;
  hapticEnabled: boolean;
}

export interface LearningData {
  totalRounds: number;
  avgGreenDwellSeconds: number;
  avgCartSpeedMph: number;
  totalConfirmations: number;
  totalRetrievals: number;
  accuracyRatingPercent: number;
}
