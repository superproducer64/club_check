import { haversineDistanceM, type GpsSample } from './stateMachine';

interface GreenCandidate {
  lat: number;
  lng: number;
  radiusM: number;
  exitRadiusM: number;
  confidence: number;
  detectedAt: number;
}

export interface HoleGreenRecord {
  holeNumber: number;
  lat: number;
  lng: number;
  capturedRoundIds: string[];
}

const GREEN_DWELL_RADIUS_M = 20;
const GREEN_EXIT_RADIUS_M = 35;
const MIN_DWELL_SAMPLES_FOR_CONFIDENCE = 4;
const STATIONARY_SPEED_THRESHOLD_MPS = 1.0;

export class GreenResolver {
  private knownGreens: Map<number, HoleGreenRecord> = new Map();
  private liveSampleBuffer: GpsSample[] = [];
  private inferredCandidate: GreenCandidate | null = null;

  loadKnownGreens(records: HoleGreenRecord[]) {
    this.knownGreens = new Map(records.map((r) => [r.holeNumber, r]));
  }

  beginHole(holeNumber: number): GreenCandidate | null {
    this.liveSampleBuffer = [];
    this.inferredCandidate = null;

    const known = this.knownGreens.get(holeNumber);
    if (known) {
      return {
        lat: known.lat,
        lng: known.lng,
        radiusM: GREEN_DWELL_RADIUS_M,
        exitRadiusM: GREEN_EXIT_RADIUS_M,
        confidence: 0.9,
        detectedAt: Date.now(),
      };
    }
    return null;
  }

  ingestSample(sample: GpsSample): GreenCandidate | null {
    if (this.inferredCandidate) return null;

    this.liveSampleBuffer.push(sample);

    const stationarySamples = this.liveSampleBuffer.filter(
      (s) => s.speedMps !== null && s.speedMps < STATIONARY_SPEED_THRESHOLD_MPS
    );

    if (stationarySamples.length < MIN_DWELL_SAMPLES_FOR_CONFIDENCE) {
      return null;
    }

    const centroid = centroidOf(stationarySamples);
    const spread = maxDistanceFromCentroid(stationarySamples, centroid);

    if (spread > 40) {
      return null;
    }

    this.inferredCandidate = {
      lat: centroid.lat,
      lng: centroid.lng,
      radiusM: GREEN_DWELL_RADIUS_M,
      exitRadiusM: GREEN_EXIT_RADIUS_M,
      confidence: Math.min(0.4 + stationarySamples.length * 0.1, 0.85),
      detectedAt: Date.now(),
    };

    return this.inferredCandidate;
  }

  finalizeHole(holeNumber: number, roundId: string): HoleGreenRecord | null {
    if (!this.inferredCandidate) return null;

    const existing = this.knownGreens.get(holeNumber);
    const record: HoleGreenRecord = existing
      ? {
          holeNumber,
          lat: weightedAverage(existing.lat, this.inferredCandidate.lat, existing.capturedRoundIds.length),
          lng: weightedAverage(existing.lng, this.inferredCandidate.lng, existing.capturedRoundIds.length),
          capturedRoundIds: [...existing.capturedRoundIds, roundId],
        }
      : {
          holeNumber,
          lat: this.inferredCandidate.lat,
          lng: this.inferredCandidate.lng,
          capturedRoundIds: [roundId],
        };

    this.knownGreens.set(holeNumber, record);
    return record;
  }
}

function centroidOf(samples: GpsSample[]): { lat: number; lng: number } {
  const lat = samples.reduce((sum, s) => sum + s.lat, 0) / samples.length;
  const lng = samples.reduce((sum, s) => sum + s.lng, 0) / samples.length;
  return { lat, lng };
}

function maxDistanceFromCentroid(samples: GpsSample[], centroid: { lat: number; lng: number }): number {
  return Math.max(...samples.map((s) => haversineDistanceM(s.lat, s.lng, centroid.lat, centroid.lng)));
}

function weightedAverage(existing: number, incoming: number, existingWeight: number): number {
  const w = Math.min(existingWeight, 10);
  return (existing * w + incoming) / (w + 1);
}
