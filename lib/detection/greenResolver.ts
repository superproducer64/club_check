import type { LatLng } from './stateMachine';

export interface HoleGreenRecord {
  holeNumber: number;
  lat: number;
  lng: number;
  capturedRoundIds: string[];
}

/** After this many confirmations a green stops moving much. */
const MAX_WEIGHT = 10;

/**
 * Keeps the learned green location for each hole of a course. Locations come
 * from confirmed green departures (the detector's stop centroid) and are
 * averaged across rounds, so each round at the same course gets more accurate.
 */
export class GreenResolver {
  private greens = new Map<number, HoleGreenRecord>();

  load(records: HoleGreenRecord[]) {
    this.greens = new Map(records.map((r) => [r.holeNumber, r]));
  }

  /** Known greens in the shape the detector wants. */
  asLatLngMap(): Map<number, LatLng> {
    const map = new Map<number, LatLng>();
    for (const [hole, r] of this.greens) map.set(hole, { lat: r.lat, lng: r.lng });
    return map;
  }

  /**
   * Fold a confirmed green location into the learned layout. Returns the
   * updated record, or null if this round already contributed to this hole.
   */
  learn(holeNumber: number, green: LatLng, roundId: string): HoleGreenRecord | null {
    const existing = this.greens.get(holeNumber);
    if (existing?.capturedRoundIds.includes(roundId)) return null;

    const record: HoleGreenRecord = existing
      ? {
          holeNumber,
          lat: weightedAverage(existing.lat, green.lat, existing.capturedRoundIds.length),
          lng: weightedAverage(existing.lng, green.lng, existing.capturedRoundIds.length),
          capturedRoundIds: [...existing.capturedRoundIds, roundId].slice(-MAX_WEIGHT),
        }
      : { holeNumber, lat: green.lat, lng: green.lng, capturedRoundIds: [roundId] };

    this.greens.set(holeNumber, record);
    return record;
  }
}

function weightedAverage(existing: number, incoming: number, existingWeight: number): number {
  const w = Math.min(existingWeight, MAX_WEIGHT);
  return (existing * w + incoming) / (w + 1);
}
