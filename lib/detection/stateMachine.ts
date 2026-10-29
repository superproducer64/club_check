/**
 * Green-departure detector.
 *
 * A golf hole, seen through GPS, is a sequence of STOPS separated by travel:
 *
 *   tee stop → (short fairway stops) → GREEN stop → walk/drive to next tee → next tee stop …
 *
 * The detector tracks stops (the golfer staying within STOP_RADIUS of an
 * anchor point) and decides, when a stop ENDS, whether that stop was the green:
 *
 *   - If the green for this hole is already known (learned from earlier rounds),
 *     a long-enough stop near it is the green.
 *   - Otherwise, the first stop of the hole is the tee and is never the green.
 *     The green is the first later stop that lasted at least minGreenDwellSec
 *     and is at least MIN_TEE_TO_GREEN_M away from the tee.
 *
 * When the green stop ends (golfer is clearly moving away), a reminder is armed
 * and fires after reminderDelaySec. The hole then advances automatically and the
 * next stop is treated as the next tee.
 *
 * This module is pure TypeScript (no React Native imports) so it can be unit tested.
 */

export type DetectionState = 'awaiting_tee' | 'playing_hole' | 'on_green' | 'reminder_pending';

export type PlayingStyle = 'riding' | 'push_cart' | 'walking';

export interface GpsSample {
  lat: number;
  lng: number;
  /** m/s. null when unknown. iOS reports -1 for unknown; callers may pass it raw. */
  speedMps: number | null;
  accuracyM: number;
  timestamp: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GreenDeparture {
  holeNumber: number;
  /** Centroid of the stop that was judged to be the green. */
  green: LatLng;
  /** Where the golfer was when the reminder fired. */
  sample: GpsSample;
  dwellSec: number;
  arrivedAt: number;
  leftAt: number;
  /** True when the green came from a learned location rather than inference. */
  fromKnownGreen: boolean;
  /** The hole's tee, kept so a false reminder can be undone (see resumeHole). */
  tee: LatLng | null;
}

export interface StateMachineConfig {
  playingStyle: PlayingStyle;
  reminderDelaySec: number;
  /** Minimum time stopped on the green before its departure counts. */
  minGreenDwellSec: number;
}

interface StateMachineEvents {
  onGreenArrival: (holeNumber: number) => void;
  onReminderTrigger: (departure: GreenDeparture) => void;
}

const DEFAULTS: Omit<StateMachineConfig, 'playingStyle'> = {
  reminderDelaySec: 4,
  minGreenDwellSec: 45,
};

/** Golfer counts as "still at the stop" while within this distance of its anchor. */
const STOP_RADIUS_M = 25;
/** Distance from the stop anchor that confirms departure. */
const EXIT_RADIUS_M = 35;
/** A stop shorter than this is just a pause (lining up a shot), not a stop. */
const MIN_STOP_SEC = 15;
/** Below this speed a sample is "stopped". */
const STATIONARY_SPEED_MPS = 0.7;
/** The green can't be this close to the tee (shortest par 3s are ~90 m). */
const MIN_TEE_TO_GREEN_M = 80;
/** A learned green matches a stop whose centroid lands within this distance. */
const KNOWN_GREEN_MATCH_M = 40;
/** Two consecutive samples outside the exit radius are required (GPS jitter guard). */
const EXIT_CONFIRM_SAMPLES = 2;
/** Samples further apart than this in time don't contribute a derived speed. */
const MAX_SPEED_DERIVE_GAP_MS = 15_000;

interface Stop {
  sumLat: number;
  sumLng: number;
  count: number;
  anchor: LatLng;
  startedAt: number;
  lastStationaryAt: number;
  outsideCount: number;
  greenArrivalAnnounced: boolean;
}

export class GreenDepartureStateMachine {
  private config: StateMachineConfig;
  private events: StateMachineEvents;

  private holeNumber = 1;
  private knownGreens = new Map<number, LatLng>();
  private tee: LatLng | null = null;
  private stop: Stop | null = null;
  private lastSample: GpsSample | null = null;
  private recentSpeeds: number[] = [];

  private pending: { departure: GreenDeparture; fireAt: number } | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    config: Partial<StateMachineConfig> & { playingStyle: PlayingStyle },
    events: StateMachineEvents
  ) {
    this.config = { ...DEFAULTS, ...config };
    this.events = events;
  }

  // ---------- configuration ----------

  setKnownGreens(greens: Map<number, LatLng>) {
    this.knownGreens = new Map(greens);
  }

  updateConfig(patch: Partial<StateMachineConfig>) {
    this.config = { ...this.config, ...patch };
  }

  /** Start tracking a hole. The next stop is treated as its tee. */
  beginHole(holeNumber: number) {
    this.clearPending();
    this.holeNumber = holeNumber;
    this.tee = null;
    // If the golfer is already stopped (e.g. standing on the tee when the
    // hole starts), that stop becomes the tee once it ends.
  }

  /**
   * Undo an automatic advance after a false reminder: go back to the given
   * hole, keeping its tee so the next qualifying stop can still be its green.
   */
  resumeHole(holeNumber: number, tee: LatLng | null) {
    this.clearPending();
    this.holeNumber = holeNumber;
    this.tee = tee;
  }

  getHoleNumber() {
    return this.holeNumber;
  }

  getTee(): LatLng | null {
    return this.tee;
  }

  getState(): DetectionState {
    if (this.pending) return 'reminder_pending';
    if (!this.tee) return 'awaiting_tee';
    if (this.stop && this.stop.greenArrivalAnnounced) return 'on_green';
    return 'playing_hole';
  }

  // ---------- main input ----------

  ingestGpsSample(raw: GpsSample) {
    const sample = this.normalize(raw);
    this.lastSample = sample;

    // A delayed reminder whose timer was suspended in the background fires on
    // the next sample instead.
    if (this.pending && sample.timestamp >= this.pending.fireAt) {
      this.firePending();
    }

    const speed = this.smoothedSpeed();
    const stationary = speed !== null && speed < STATIONARY_SPEED_MPS;

    if (!this.stop) {
      if (stationary) this.openStop(sample);
      return;
    }

    const distFromAnchor = haversineDistanceM(sample.lat, sample.lng, this.stop.anchor.lat, this.stop.anchor.lng);

    if (distFromAnchor <= STOP_RADIUS_M) {
      this.stop.outsideCount = 0;
      if (stationary) {
        this.stop.sumLat += sample.lat;
        this.stop.sumLng += sample.lng;
        this.stop.count += 1;
        this.stop.anchor = { lat: this.stop.sumLat / this.stop.count, lng: this.stop.sumLng / this.stop.count };
        this.stop.lastStationaryAt = sample.timestamp;
      }
      this.maybeAnnounceGreenArrival(sample.timestamp);
      return;
    }

    if (distFromAnchor > this.exitRadius()) {
      this.stop.outsideCount += 1;
      if (this.stop.outsideCount >= EXIT_CONFIRM_SAMPLES) {
        this.closeStop(sample);
        if (stationary) this.openStop(sample);
      }
    }
    // Between STOP_RADIUS and the exit radius: ambiguous, keep the stop open.
  }

  // ---------- stop handling ----------

  private openStop(sample: GpsSample) {
    this.stop = {
      sumLat: sample.lat,
      sumLng: sample.lng,
      count: 1,
      anchor: { lat: sample.lat, lng: sample.lng },
      startedAt: sample.timestamp,
      lastStationaryAt: sample.timestamp,
      outsideCount: 0,
      greenArrivalAnnounced: false,
    };
  }

  private closeStop(sample: GpsSample) {
    const stop = this.stop;
    this.stop = null;
    if (!stop) return;

    const dwellSec = (stop.lastStationaryAt - stop.startedAt) / 1000;
    if (dwellSec < MIN_STOP_SEC) return; // just a pause

    if (this.pending) return; // already handled this hole

    const verdict = this.classifyStop(stop.anchor, dwellSec);

    if (verdict === 'tee') {
      this.tee = stop.anchor;
      return;
    }

    if (verdict === 'green') {
      this.armReminder({
        holeNumber: this.holeNumber,
        green: stop.anchor,
        sample,
        dwellSec,
        arrivedAt: stop.startedAt,
        leftAt: sample.timestamp,
        fromKnownGreen: this.knownGreens.has(this.holeNumber),
        tee: this.tee,
      });
    }
  }

  private classifyStop(centroid: LatLng, dwellSec: number): 'tee' | 'green' | 'other' {
    const known = this.knownGreens.get(this.holeNumber);
    if (known) {
      const d = haversineDistanceM(centroid.lat, centroid.lng, known.lat, known.lng);
      if (d <= KNOWN_GREEN_MATCH_M && dwellSec >= this.config.minGreenDwellSec * 0.6) return 'green';
      if (!this.tee) return 'tee';
      return 'other';
    }

    if (!this.tee) return 'tee';

    const fromTee = haversineDistanceM(centroid.lat, centroid.lng, this.tee.lat, this.tee.lng);
    if (dwellSec >= this.config.minGreenDwellSec && fromTee >= MIN_TEE_TO_GREEN_M) return 'green';
    return 'other';
  }

  private maybeAnnounceGreenArrival(now: number) {
    const stop = this.stop;
    if (!stop || stop.greenArrivalAnnounced || !this.tee) return;
    const dwellSec = (now - stop.startedAt) / 1000;
    if (dwellSec < this.config.minGreenDwellSec) return;
    const fromTee = haversineDistanceM(stop.anchor.lat, stop.anchor.lng, this.tee.lat, this.tee.lng);
    if (fromTee < MIN_TEE_TO_GREEN_M) return;
    stop.greenArrivalAnnounced = true;
    this.events.onGreenArrival(this.holeNumber);
  }

  // ---------- reminder ----------

  private armReminder(departure: GreenDeparture) {
    const delayMs = Math.max(0, this.config.reminderDelaySec * 1000);
    this.pending = { departure, fireAt: departure.leftAt + delayMs };
    this.pendingTimer = setTimeout(() => this.firePending(), delayMs);
  }

  private firePending() {
    const pending = this.pending;
    if (!pending) return;
    this.clearPending();

    const departure = { ...pending.departure, sample: this.lastSample ?? pending.departure.sample };
    // Advance before notifying so listeners see the new hole.
    this.holeNumber = departure.holeNumber + 1;
    this.tee = null;
    this.events.onReminderTrigger(departure);
  }

  private clearPending() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    this.pending = null;
  }

  // ---------- speed ----------

  private normalize(raw: GpsSample): GpsSample {
    let speed = raw.speedMps;
    if (speed === null || !Number.isFinite(speed) || speed < 0) {
      speed = null;
      const prev = this.lastSample;
      if (prev) {
        const dt = raw.timestamp - prev.timestamp;
        if (dt > 0 && dt <= MAX_SPEED_DERIVE_GAP_MS) {
          speed = haversineDistanceM(prev.lat, prev.lng, raw.lat, raw.lng) / (dt / 1000);
        }
      }
    }
    if (speed !== null) {
      this.recentSpeeds.push(speed);
      if (this.recentSpeeds.length > 3) this.recentSpeeds.shift();
    }
    return { ...raw, speedMps: speed };
  }

  private smoothedSpeed(): number | null {
    if (this.recentSpeeds.length === 0) return null;
    return this.recentSpeeds.reduce((a, b) => a + b, 0) / this.recentSpeeds.length;
  }

  private exitRadius() {
    return EXIT_RADIUS_M;
  }

  dispose() {
    this.clearPending();
  }
}

export function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
