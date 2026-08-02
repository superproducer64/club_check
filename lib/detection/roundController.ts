import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { GreenDepartureStateMachine, type DetectionState, type GpsSample } from './stateMachine';
import { GreenResolver } from './greenResolver';
import { speak } from '../voice/speak';
import { fireReminderNotification } from '../notifications/reminderNotifications';
import { startBackgroundTracking, stopBackgroundTracking, requestBackgroundLocationPermissions } from './backgroundLocationManager';
import { useRoundStore } from '../../stores/useRoundStore';
import { useReminderStore } from '../../stores/useReminderStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useLearningStore } from '../../stores/useLearningStore';
import * as remindersDb from '../db/reminders';
import * as holesPlayedDb from '../db/holesPlayed';
import * as courseHistoryDb from '../db/courseHistory';

interface ControllerDeps {
  roundId: string;
  courseId: string;
  playingStyle: 'riding' | 'push_cart' | 'walking';
}

export class RoundController {
  private stateMachine: GreenDepartureStateMachine;
  private greenResolver: GreenResolver;
  private roundId: string;
  private courseId: string;
  private currentHoleGreenSet = false;

  constructor({ roundId, courseId, playingStyle }: ControllerDeps) {
    this.roundId = roundId;
    this.courseId = courseId;
    this.greenResolver = new GreenResolver();

    const learning = useLearningStore.getState();

    this.stateMachine = new GreenDepartureStateMachine(
      {
        playingStyle,
        reminderDelaySec: learning.reminderDelaySec,
        reminderDistanceM: learning.reminderDistanceM,
      },
      {
        onGreenArrival: () => this.handleGreenArrival(),
        onGreenDeparture: () => this.handleGreenDeparture(),
        onReminderTrigger: (sample) => this.handleReminderTrigger(sample),
      }
    );
  }

  async start() {
    const hasPermission = await requestBackgroundLocationPermissions();
    if (!hasPermission) {
      useRoundStore.getState().setGpsStatus('lost');
      throw new Error('BACKGROUND_LOCATION_DENIED');
    }

    const knownGreens = await courseHistoryDb.getHoleGreens(this.courseId);
    this.greenResolver.loadKnownGreens(knownGreens);
    this.beginHole(useRoundStore.getState().currentHole);

    const { gpsAccuracy } = useSettingsStore.getState();

    await startBackgroundTracking({
      accuracy: this.mapAccuracySetting(gpsAccuracy),
      onLocations: (locations) => {
        for (const loc of locations) {
          this.handleLocationUpdate(loc);
        }
      },
    });

    useRoundStore.getState().setGpsStatus('active');
  }

  async stop() {
    await stopBackgroundTracking();
    useRoundStore.getState().setGpsStatus('searching');
  }

  beginHole(holeNumber: number) {
    this.currentHoleGreenSet = false;
    const known = this.greenResolver.beginHole(holeNumber);
    if (known) {
      this.stateMachine.setActiveGreen(known);
      this.currentHoleGreenSet = true;
    }
  }

  private handleLocationUpdate(loc: Location.LocationObject) {
    const sample: GpsSample = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speedMps: loc.coords.speed,
      accuracyM: loc.coords.accuracy ?? 999,
      timestamp: loc.timestamp,
    };

    if (sample.accuracyM > 25) {
      useRoundStore.getState().setGpsStatus('lost');
      return;
    }
    useRoundStore.getState().setGpsStatus('active');

    if (!this.currentHoleGreenSet) {
      const candidate = this.greenResolver.ingestSample(sample);
      if (candidate) {
        this.stateMachine.setActiveGreen(candidate);
        this.currentHoleGreenSet = true;
      }
    }

    this.stateMachine.ingestGpsSample(sample);
  }

  private handleGreenArrival() {
    useRoundStore.getState().markGreenArrival();
  }

  private handleGreenDeparture() {
    useRoundStore.getState().markGreenDeparture();
  }

  private async handleReminderTrigger(sample: GpsSample) {
    const { alertMode, voiceSelection, voiceVolume } = useSettingsStore.getState();
    const learning = useLearningStore.getState();

    const reminderId = useReminderStore.getState().triggerReminder(sample.lat, sample.lng);

    await remindersDb.create({
      id: reminderId,
      roundId: this.roundId,
      triggeredAt: Date.now(),
      triggerLat: sample.lat,
      triggerLng: sample.lng,
      gpsAccuracyM: sample.accuracyM,
      delayUsedSec: learning.reminderDelaySec,
      distanceUsedM: learning.reminderDistanceM,
      outcome: 'pending',
    });

    const wasAppForegrounded = AppState.currentState === 'active';

    await fireReminderNotification({ reminderId, wasAppForegrounded });

    if (wasAppForegrounded) {
      if (alertMode === 'voice') {
        await speak('Club Check.', { voice: voiceSelection, volume: voiceVolume });
      } else if (alertMode === 'tone') {
        await speak('Club Check.', { voice: voiceSelection, volume: voiceVolume, toneOnly: true });
      }
      router.push({ pathname: '/modals/reminder', params: { reminderId } });
    }
  }

  async confirmReminder(reminderId: string, respondedAt: number) {
    const reminder = await remindersDb.get(reminderId);
    if (!reminder) return;

    await remindersDb.updateOutcome(reminderId, 'confirmed', respondedAt - reminder.triggered_at);
    useReminderStore.getState().confirmReminder();

    await this.finalizeCurrentHole();
    this.stateMachine.acknowledgeReminder();
  }

  async dismissReminder(reminderId: string) {
    await remindersDb.updateOutcome(reminderId, 'dismissed', null);
    useReminderStore.getState().dismissReminder();

    await this.finalizeCurrentHole();
    this.stateMachine.acknowledgeReminder();
  }

  async flagFalsePositive(reminderId: string) {
    await remindersDb.updateOutcome(reminderId, 'false_positive', null);
    useReminderStore.getState().flagFalsePositive();
    this.stateMachine.acknowledgeReminder();
  }

  private async finalizeCurrentHole() {
    const currentHole = useRoundStore.getState().currentHole;
    const record = this.greenResolver.finalizeHole(currentHole, this.roundId);
    if (record) {
      await courseHistoryDb.upsertHoleGreen(this.courseId, record);
    }

    const holeProgress = useRoundStore
      .getState()
      .holeProgress.find((h) => h.holeNumber === currentHole);

    if (holeProgress?.arrivedGreenAt && holeProgress?.leftGreenAt) {
      await holesPlayedDb.create({
        roundId: this.roundId,
        holeNumber: currentHole,
        arrivedGreenAt: holeProgress.arrivedGreenAt,
        leftGreenAt: holeProgress.leftGreenAt,
        greenDwellSec: (holeProgress.leftGreenAt - holeProgress.arrivedGreenAt) / 1000,
      });
    }
  }

  private mapAccuracySetting(setting: 'high' | 'balanced' | 'low_power'): Location.Accuracy {
    switch (setting) {
      case 'high':
        return Location.Accuracy.BestForNavigation;
      case 'low_power':
        return Location.Accuracy.Balanced;
      default:
        return Location.Accuracy.High;
    }
  }

  getDetectionState(): DetectionState {
    return this.stateMachine.getState();
  }
}
