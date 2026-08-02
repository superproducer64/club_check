export type DetectionState =
  | 'idle'
  | 'approaching_green'
  | 'on_green'
  | 'leaving_green'
  | 'reminder_pending'
  | 'reminder_fired';

export interface GpsSample {
  lat: number;
  lng: number;
  speedMps: number | null;
  accuracyM: number;
  timestamp: number;
}

interface GreenLocation {
  lat: number;
  lng: number;
  radiusM: number;
  exitRadiusM: number;
}

interface StateMachineConfig {
  playingStyle: 'riding' | 'push_cart' | 'walking';
  reminderDelaySec: number;
  reminderDistanceM: number;
  walkingSpeedThresholdMps: number;
  cartSpeedThresholdMps: number;
}

interface StateMachineEvents {
  onGreenArrival: () => void;
  onGreenDeparture: () => void;
  onReminderTrigger: (sample: GpsSample) => void;
}

const DEFAULT_CONFIG: Omit<StateMachineConfig, 'playingStyle'> = {
  reminderDelaySec: 4.0,
  reminderDistanceM: 15.0,
  walkingSpeedThresholdMps: 0.8,
  cartSpeedThresholdMps: 2.5,
};

export class GreenDepartureStateMachine {
  private state: DetectionState = 'idle';
  private config: StateMachineConfig;
  private events: StateMachineEvents;
  private currentGreen: GreenLocation | null = null;
  private exitTimestamp: number | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private samples: GpsSample[] = [];
  private readonly SAMPLE_WINDOW = 5;

  constructor(
    config: Partial<StateMachineConfig> & { playingStyle: StateMachineConfig['playingStyle'] },
    events: StateMachineEvents
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events;
  }

  setActiveGreen(green: GreenLocation) {
    this.currentGreen = green;
    if (this.state === 'idle') {
      this.state = 'approaching_green';
    }
  }

  clearActiveGreen() {
    this.currentGreen = null;
    this.resetToIdle();
  }

  ingestGpsSample(sample: GpsSample) {
    this.samples.push(sample);
    if (this.samples.length > this.SAMPLE_WINDOW) this.samples.shift();

    if (!this.currentGreen) return;

    const distanceToGreen = haversineDistanceM(
      sample.lat,
      sample.lng,
      this.currentGreen.lat,
      this.currentGreen.lng
    );
    const smoothedSpeed = this.getSmoothedSpeed();

    switch (this.state) {
      case 'approaching_green':
        if (distanceToGreen <= this.currentGreen.radiusM) {
          this.state = 'on_green';
          this.events.onGreenArrival();
        }
        break;

      case 'on_green': {
        const leavingThreshold =
          this.config.playingStyle === 'walking'
            ? this.config.walkingSpeedThresholdMps
            : this.config.walkingSpeedThresholdMps * 1.3;

        if (smoothedSpeed !== null && smoothedSpeed > leavingThreshold) {
          this.state = 'leaving_green';
        }
        break;
      }

      case 'leaving_green':
        if (distanceToGreen > this.currentGreen.exitRadiusM) {
          const confirmedSpeed =
            smoothedSpeed !== null && smoothedSpeed > this.config.walkingSpeedThresholdMps;
          if (confirmedSpeed) {
            this.exitTimestamp = sample.timestamp;
            this.events.onGreenDeparture();
            this.enterPendingState(sample);
          } else {
            this.state = 'on_green';
          }
        } else if (distanceToGreen <= this.currentGreen.radiusM) {
          this.state = 'on_green';
        }
        break;

      case 'reminder_pending':
      case 'reminder_fired':
      case 'idle':
        break;
    }
  }

  private enterPendingState(sample: GpsSample) {
    this.state = 'reminder_pending';
    this.pendingTimer = setTimeout(() => {
      this.state = 'reminder_fired';
      this.events.onReminderTrigger(sample);
    }, this.config.reminderDelaySec * 1000);
  }

  acknowledgeReminder() {
    this.resetToIdle();
  }

  cancelPendingReminder() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.state === 'reminder_pending') {
      this.state = 'on_green';
    }
  }

  private resetToIdle() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.state = 'idle';
    this.exitTimestamp = null;
  }

  private getSmoothedSpeed(): number | null {
    const validSpeeds = this.samples.map((s) => s.speedMps).filter((s): s is number => s !== null);
    if (validSpeeds.length === 0) return null;
    return validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length;
  }

  getState(): DetectionState {
    return this.state;
  }

  updateConfig(patch: Partial<StateMachineConfig>) {
    this.config = { ...this.config, ...patch };
  }
}

export function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
