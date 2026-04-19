import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'transcripts.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_transcript TEXT NOT NULL,
        cleaned_transcript TEXT NOT NULL
      )
    `);
  }
  return db;
}

function saveTranscript(raw, cleaned) {
  const stmt = getDb().prepare(
    'INSERT INTO transcripts (raw_transcript, cleaned_transcript) VALUES (?, ?)'
  );
  const result = stmt.run(raw, cleaned);
  return result.lastInsertRowid;
}

function getHistory(limit = 50) {
  return getDb()
    .prepare('SELECT id, created_at, raw_transcript, cleaned_transcript FROM transcripts ORDER BY created_at DESC LIMIT ?')
    .all(limit);
}

function deleteTranscript(id) {
  const result = getDb().prepare('DELETE FROM transcripts WHERE id = ?').run(id);
  return result.changes > 0;
}

function clearHistory() {
  getDb().prepare('DELETE FROM transcripts').run();
}

export { saveTranscript, getHistory, deleteTranscript, clearHistory };
