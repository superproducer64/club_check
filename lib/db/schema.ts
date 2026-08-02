export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  course_name TEXT NOT NULL,
  playing_style TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_sec INTEGER,
  hole_count INTEGER DEFAULT 18,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS holes_played (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  hole_number INTEGER NOT NULL,
  arrived_green_at INTEGER,
  left_green_at INTEGER,
  green_dwell_sec INTEGER,
  hole_duration_sec INTEGER,
  avg_speed_mps REAL,
  UNIQUE(round_id, hole_number)
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  hole_played_id TEXT REFERENCES holes_played(id),
  triggered_at INTEGER NOT NULL,
  trigger_lat REAL,
  trigger_lng REAL,
  gps_accuracy_m REAL,
  delay_used_sec REAL NOT NULL,
  distance_used_m REAL NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'pending',
  response_latency_ms INTEGER
);

CREATE TABLE IF NOT EXISTS learning_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  avg_hole_duration_sec REAL,
  avg_green_dwell_sec REAL,
  avg_walking_speed_mps REAL,
  avg_cart_speed_mps REAL,
  avg_round_duration_sec REAL,
  reminder_delay_sec REAL DEFAULT 4.0,
  reminder_distance_m REAL DEFAULT 15.0,
  rounds_completed INTEGER DEFAULT 0,
  confirmation_rate REAL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS course_history (
  course_id TEXT PRIMARY KEY,
  course_name TEXT NOT NULL,
  last_played_at INTEGER,
  times_played INTEGER DEFAULT 1,
  saved_hole_layout TEXT
);

CREATE INDEX IF NOT EXISTS idx_holes_played_round ON holes_played(round_id);
CREATE INDEX IF NOT EXISTS idx_reminders_round ON reminders(round_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_started_at ON rounds(started_at);
`;

export const SEED_LEARNING_STATS_SQL = `
INSERT OR IGNORE INTO learning_stats (id, reminder_delay_sec, reminder_distance_m, rounds_completed)
VALUES (1, 4.0, 15.0, 0);
`;
