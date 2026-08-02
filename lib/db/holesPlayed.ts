import { getDb } from './init';

interface CreateHolePlayedParams {
  roundId: string;
  holeNumber: number;
  arrivedGreenAt: number;
  leftGreenAt: number;
  greenDwellSec: number;
}

export async function create(params: CreateHolePlayedParams) {
  const db = getDb();
  const id = `${params.roundId}-${params.holeNumber}`;
  const holeDurationSec = null; // requires previous hole's departure time to compute; left null for MVP

  await db.runAsync(
    `INSERT OR REPLACE INTO holes_played
       (id, round_id, hole_number, arrived_green_at, left_green_at, green_dwell_sec, hole_duration_sec)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.roundId,
      params.holeNumber,
      params.arrivedGreenAt,
      params.leftGreenAt,
      params.greenDwellSec,
      holeDurationSec,
    ]
  );

  await updateLearningStatsFromHole(params.greenDwellSec);
}

/**
 * Rolling-average update to learning_stats after each hole completes.
 * Simple incremental average — not a weighted/decaying model for MVP,
 * matching the "simple, reliable" design principle over sophistication.
 */
async function updateLearningStatsFromHole(greenDwellSec: number) {
  const db = getDb();
  const current = await db.getFirstAsync<{
    avg_green_dwell_sec: number | null;
    rounds_completed: number;
  }>(`SELECT avg_green_dwell_sec, rounds_completed FROM learning_stats WHERE id = 1`);

  if (!current) return;

  const priorCount = current.rounds_completed || 0;
  const newAvg = current.avg_green_dwell_sec
    ? (current.avg_green_dwell_sec * priorCount + greenDwellSec) / (priorCount + 1)
    : greenDwellSec;

  await db.runAsync(`UPDATE learning_stats SET avg_green_dwell_sec = ?, updated_at = ? WHERE id = 1`, [
    newAvg,
    Date.now(),
  ]);
}

export async function getForRound(roundId: string) {
  const db = getDb();
  return db.getAllAsync<{
    hole_number: number;
    green_dwell_sec: number | null;
  }>(`SELECT hole_number, green_dwell_sec FROM holes_played WHERE round_id = ? ORDER BY hole_number`, [
    roundId,
  ]);
}
