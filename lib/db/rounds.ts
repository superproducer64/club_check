import { getDb } from './init';

interface CreateRoundParams {
  id: string;
  courseId: string;
  courseName: string;
  playingStyle: 'riding' | 'push_cart' | 'walking';
  startedAt: number;
}

export async function create(params: CreateRoundParams) {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO rounds (id, course_id, course_name, playing_style, started_at, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [params.id, params.courseId, params.courseName, params.playingStyle, params.startedAt]
  );
}

export async function complete(roundId: string, durationSec: number) {
  const db = getDb();
  await db.runAsync(`UPDATE rounds SET status = 'completed', ended_at = ?, duration_sec = ? WHERE id = ?`, [
    Date.now(),
    durationSec,
    roundId,
  ]);
}

export async function getHistory(limit = 20) {
  const db = getDb();
  return db.getAllAsync<{
    id: string;
    course_name: string;
    started_at: number;
    duration_sec: number | null;
    status: string;
  }>(
    `SELECT id, course_name, started_at, duration_sec, status
     FROM rounds WHERE status = 'completed'
     ORDER BY started_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getEstimatedPaceRemaining(currentHole: number): Promise<number | null> {
  const db = getDb();
  const stats = await db.getFirstAsync<{ avg_hole_duration_sec: number | null }>(
    `SELECT avg_hole_duration_sec FROM learning_stats WHERE id = 1`
  );
  if (!stats?.avg_hole_duration_sec) return null;

  const holesRemaining = 18 - currentHole + 1;
  return Math.round(stats.avg_hole_duration_sec * holesRemaining);
}
