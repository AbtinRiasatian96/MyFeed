import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "myfeed.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        image TEXT,
        source TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export interface ReadingItem {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  is_read: number;
  created_at: string;
}

export function getAllItems(): ReadingItem[] {
  return getDb()
    .prepare("SELECT * FROM items ORDER BY created_at DESC")
    .all() as ReadingItem[];
}

export function addItem(
  url: string,
  title: string | null,
  description: string | null,
  image: string | null,
  source: string | null
): ReadingItem {
  const stmt = getDb().prepare(
    "INSERT INTO items (url, title, description, image, source) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(url, title, description, image, source);
  return getDb()
    .prepare("SELECT * FROM items WHERE id = ?")
    .get(result.lastInsertRowid) as ReadingItem;
}

export function toggleRead(id: number): ReadingItem | undefined {
  getDb()
    .prepare("UPDATE items SET is_read = CASE WHEN is_read = 0 THEN 1 ELSE 0 END WHERE id = ?")
    .run(id);
  return getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as ReadingItem | undefined;
}

export function deleteItem(id: number): void {
  getDb().prepare("DELETE FROM items WHERE id = ?").run(id);
}
