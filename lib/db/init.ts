import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_LEARNING_STATS_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'clubcheck.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);

  dbInstance = db;
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const versionRow = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM schema_meta WHERE key = 'version'`
  );
  const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;

  if (currentVersion === 0) {
    await db.execAsync(CREATE_TABLES_SQL);
    await db.execAsync(SEED_LEARNING_STATS_SQL);
    await db.runAsync(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`, [
      String(SCHEMA_VERSION),
    ]);
    return;
  }

  if (currentVersion < SCHEMA_VERSION) {
    await db.runAsync(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`, [
      String(SCHEMA_VERSION),
    ]);
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized — call initDatabase() at app boot before any db access');
  }
  return dbInstance;
}
