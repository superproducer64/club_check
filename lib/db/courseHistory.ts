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

/** Record that a round started at this course (creates the course on first play). */
export async function touchCourse(courseId: string, courseName: string) {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO course_history (course_id, course_name, last_played_at, times_played, saved_hole_layout)
     VALUES (?, ?, ?, 1, NULL)
     ON CONFLICT(course_id) DO UPDATE SET
       course_name = excluded.course_name,
       last_played_at = excluded.last_played_at,
       times_played = times_played + 1`,
    [courseId, courseName, Date.now()]
  );
}

/** Save one hole's learned green into the course's layout. */
export async function upsertHoleGreen(courseId: string, record: HoleGreenRecord) {
  const db = getDb();
  const existing = await getHoleGreens(courseId);
  const updated = existing.filter((r) => r.holeNumber !== record.holeNumber);
  updated.push(record);

  await db.runAsync(`UPDATE course_history SET saved_hole_layout = ? WHERE course_id = ?`, [
    JSON.stringify(updated),
    courseId,
  ]);
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
