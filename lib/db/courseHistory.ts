import { getDb } from './init';
import type { HoleGreenRecord } from '../detection/greenResolver';

export async function getHoleGreens(courseId: string): Promise<HoleGreenRecord[]> {
  const db = getDb();
  const row = await db.getFirstAsync<{ saved_hole_layout: string | null }>(
    `SELECT saved_hole_layout FROM course_history WHERE course_id = ?`,
    [courseId]
  );
  if (!row?.saved_hole_layout) return [];

  try {
    return JSON.parse(row.saved_hole_layout) as HoleGreenRecord[];
  } catch {
    // Corrupt or unexpected JSON — treat as no known greens rather than crashing the round
    return [];
  }
}

export async function upsertHoleGreen(courseId: string, record: HoleGreenRecord) {
  const db = getDb();
  const existing = await getHoleGreens(courseId);
  const updated = existing.filter((r) => r.holeNumber !== record.holeNumber);
  updated.push(record);

  const courseName = await getCourseNameOrFallback(courseId);

  await db.runAsync(
    `INSERT INTO course_history (course_id, course_name, last_played_at, times_played, saved_hole_layout)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(course_id) DO UPDATE SET
       last_played_at = excluded.last_played_at,
       times_played = times_played + 1,
       saved_hole_layout = excluded.saved_hole_layout`,
    [courseId, courseName, Date.now(), JSON.stringify(updated)]
  );
}

async function getCourseNameOrFallback(courseId: string): Promise<string> {
  const db = getDb();
  const existing = await db.getFirstAsync<{ course_name: string }>(
    `SELECT course_name FROM course_history WHERE course_id = ?`,
    [courseId]
  );
  // course_name gets set properly on round creation via rounds.create();
  // this fallback only matters on the very first upsert for a brand-new course
  return existing?.course_name ?? 'Unknown Course';
}

export async function getRecentCourses(limit = 10) {
  const db = getDb();
  return db.getAllAsync<{
    course_id: string;
    course_name: string;
    last_played_at: number;
    times_played: number;
  }>(`SELECT course_id, course_name, last_played_at, times_played FROM course_history ORDER BY last_played_at DESC LIMIT ?`, [
    limit,
  ]);
}
