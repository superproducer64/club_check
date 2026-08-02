import { getDb } from './init';

interface CreateReminderParams {
  id: string;
  roundId: string;
  triggeredAt: number;
  triggerLat: number;
  triggerLng: number;
  gpsAccuracyM: number;
  delayUsedSec: number;
  distanceUsedM: number;
  outcome: 'pending';
}

export async function create(params: CreateReminderParams) {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO reminders
       (id, round_id, triggered_at, trigger_lat, trigger_lng, gps_accuracy_m, delay_used_sec, distance_used_m, outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      params.roundId,
      params.triggeredAt,
      params.triggerLat,
      params.triggerLng,
      params.gpsAccuracyM,
      params.delayUsedSec,
      params.distanceUsedM,
      params.outcome,
    ]
  );
}

export async function get(reminderId: string) {
  const db = getDb();
  return db.getFirstAsync<{ id: string; triggered_at: number; round_id: string }>(
    `SELECT id, triggered_at, round_id FROM reminders WHERE id = ?`,
    [reminderId]
  );
}

export async function updateOutcome(
  reminderId: string,
  outcome: 'confirmed' | 'dismissed' | 'false_positive',
  responseLatencyMs: number | null
) {
  const db = getDb();
  await db.runAsync(`UPDATE reminders SET outcome = ?, response_latency_ms = ? WHERE id = ?`, [
    outcome,
    responseLatencyMs,
    reminderId,
  ]);
}

export async function getStatsForRound(roundId: string) {
  const db = getDb();
  return db.getFirstAsync<{
    total: number;
    confirmed: number;
    dismissed: number;
    false_positive: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN outcome = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
       SUM(CASE WHEN outcome = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
       SUM(CASE WHEN outcome = 'false_positive' THEN 1 ELSE 0 END) as false_positive
     FROM reminders WHERE round_id = ?`,
    [roundId]
  );
}
