import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { GreenDepartureStateMachine, type GpsSample, type GreenDeparture } from './stateMachine';
import { GreenResolver } from './greenResolver';
import { speak } from '../voice/speak';
import { fireReminderNotification } from '../notifications/reminderNotifications';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  requestBackgroundLocationPermissions,
} from './backgroundLocationManager';
import { registerLocationHandler } from './backgroundLocationTask';
import { useRoundStore, type PlayingStyle } from '../../stores/useRoundStore';
import { useReminderStore } from '../../stores/useReminderStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useLearningStore } from '../../stores/useLearningStore';
import * as remindersDb from '../db/reminders';
import * as holesPlayedDb from '../db/holesPlayed';
import * as courseHistoryDb from '../db/courseHistory';

interface ControllerDeps {
  roundId: string;
  courseId: string;
  playingStyle: PlayingStyle;
}

/** Fixes worse than this are ignored rather than fed to the detector. */
const MAX_USABLE_ACCURACY_M = 30;

export class RoundController {
  private stateMachine: GreenDepartureStateMachine;
  private greenResolver = new GreenResolver();
  private roundId: string;
  private courseId: string;
  /** Departures awaiting the golfer's response, by reminder id. */
  private departures = new Map<string, GreenDeparture>();

  constructor({ roundId, courseId, playingStyle }: ControllerDeps) {
    this.roundId = roundId;
    this.courseId = courseId;

    const learning = useLearningStore.getState();
    const settings = useSettingsStore.getState();

    this.stateMachine = new GreenDepartureStateMachine(
      {
        playingStyle,
        reminderDelaySec: settings.reminderDelaySec ?? learning.reminderDelaySec,
      },
      {
        onGreenArrival: () => {},
        onReminderTrigger: (departure) => {
          this.handleReminderTrigger(departure).catch((err) =>
            console.error('[ClubCheck] reminder failed:', err)
          );
        },
      }
    );
  }

  get id() {
    return this.roundId;
  }

  /** Start a round from the foreground: asks for permission and starts location updates. */
  async start() {
    const hasPermission = await requestBackgroundLocationPermissions();
    if (!hasPermission) {
      useRoundStore.getState().setGpsStatus('lost');
      throw new Error('BACKGROUND_LOCATION_DENIED');
    }

    await this.attach();

    const { gpsAccuracy } = useSettingsStore.getState();
    await startBackgroundTracking({
      accuracy: mapAccuracySetting(gpsAccuracy),
      onLocations: (locations) => this.handleLocations(locations),
    });
  }

  /**
   * Rebuild detection state without touching location updates. Used when the
   * OS relaunches the app while updates are already running.
   */
  async attach() {
    const knownGreens = await courseHistoryDb.getHoleGreens(this.courseId);
    this.greenResolver.load(knownGreens);
    this.stateMachine.setKnownGreens(this.greenResolver.asLatLngMap());
    this.stateMachine.beginHole(useRoundStore.getState().currentHole);
    registerLocationHandler((locations) => this.handleLocations(locations));
    useRoundStore.getState().setGpsStatus('searching');
  }

  async stop() {
    this.stateMachine.dispose();
    await stopBackgroundTracking();
  }

  /** Manual hole change from the round screen. */
  goToHole(holeNumber: number) {
    useRoundStore.getState().setCurrentHole(holeNumber);
    this.stateMachine.beginHole(holeNumber);
  }

  handleLocations(locations: Location.LocationObject[]) {
    for (const loc of locations) this.handleLocationUpdate(loc);
  }

  private handleLocationUpdate(loc: Location.LocationObject) {
    const sample: GpsSample = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speedMps: loc.coords.speed,
      accuracyM: loc.coords.accuracy ?? 999,
      timestamp: loc.timestamp,
    };

    const store = useRoundStore.getState();
    if (sample.accuracyM > MAX_USABLE_ACCURACY_M) {
      if (store.gpsStatus !== 'lost') store.setGpsStatus('lost');
      return;
    }
    if (store.gpsStatus !== 'active') store.setGpsStatus('active');

    this.stateMachine.ingestGpsSample(sample);
  }

  private async handleReminderTrigger(departure: GreenDeparture) {
    const round = useRoundStore.getState();
    // The detector has already moved on to the next hole.
    round.setCurrentHole(this.stateMachine.getHoleNumber());
    round.recordGreenVisit(departure.holeNumber, departure.arrivedAt, departure.leftAt);

    const reminderId = Crypto.randomUUID();
    useReminderStore.getState().triggerReminder(reminderId, departure.sample.lat, departure.sample.lng);
    this.departures.set(reminderId, departure);

    const { alertMode, voiceSelection, voiceVolume, reminderDelaySec } = useSettingsStore.getState();

    await remindersDb.create({
      id: reminderId,
      roundId: this.roundId,
      triggeredAt: Date.now(),
      triggerLat: departure.sample.lat,
      triggerLng: departure.sample.lng,
      gpsAccuracyM: departure.sample.accuracyM,
      delayUsedSec: reminderDelaySec,
      distanceUsedM: 35,
      outcome: 'pending',
    });

    const foreground = AppState.currentState === 'active';

    // Always post the notification: it's what reaches a locked phone in a pocket,
    // and it carries the "All Clubs Accounted For" action.
    await fireReminderNotification({ reminderId, silent: alertMode === 'silent' });

    if (foreground) {
      if (alertMode === 'voice' || alertMode === 'tone') {
        await speak('Club Check.', { voice: voiceSelection, volume: voiceVolume });
      }
      router.push({ pathname: '/modals/reminder', params: { reminderId } });
    }
  }

  async confirmReminder(reminderId: string, respondedAt: number) {
    const reminder = await remindersDb.get(reminderId);
    if (!reminder) return;
    await remindersDb.updateOutcome(reminderId, 'confirmed', respondedAt - reminder.triggered_at);
    useReminderStore.getState().resolve(reminderId);
    await this.learnFrom(reminderId);
  }

  async dismissReminder(reminderId: string) {
    await remindersDb.updateOutcome(reminderId, 'dismissed', null);
    useReminderStore.getState().resolve(reminderId);
    await this.learnFrom(reminderId);
  }

  /**
   * "This wasn't the green": record it, don't learn the location, and undo
   * the automatic hole advance so the real green still gets its reminder.
   */
  async flagFalsePositive(reminderId: string) {
    await remindersDb.updateOutcome(reminderId, 'false_positive', null);
    useReminderStore.getState().resolve(reminderId);

    const departure = this.departures.get(reminderId);
    this.departures.delete(reminderId);
    if (!departure) return;

    // Only roll back if nothing has happened on the next hole yet.
    if (this.stateMachine.getHoleNumber() === departure.holeNumber + 1 && !this.stateMachine.getTee()) {
      useRoundStore.getState().setCurrentHole(departure.holeNumber);
      this.stateMachine.resumeHole(departure.holeNumber, departure.tee);
    }
  }

  private async learnFrom(reminderId: string) {
    const departure = this.departures.get(reminderId);
    this.departures.delete(reminderId);
    if (!departure) return;

    const record = this.greenResolver.learn(departure.holeNumber, departure.green, this.roundId);
    if (record) {
      await courseHistoryDb.upsertHoleGreen(this.courseId, record);
      this.stateMachine.setKnownGreens(this.greenResolver.asLatLngMap());
    }

    await holesPlayedDb.create({
      roundId: this.roundId,
      holeNumber: departure.holeNumber,
      arrivedGreenAt: departure.arrivedAt,
      leftGreenAt: departure.leftAt,
      greenDwellSec: Math.round(departure.dwellSec),
    });
  }
}

function mapAccuracySetting(setting: 'high' | 'balanced' | 'low_power'): Location.Accuracy {
  switch (setting) {
    case 'high':
      return Location.Accuracy.BestForNavigation;
    case 'low_power':
      return Location.Accuracy.Balanced;
    default:
      return Location.Accuracy.High;
  }
}
