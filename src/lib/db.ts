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
        created_at TEXT DEFAULT (datetime('now')),
        item_type TEXT DEFAULT 'article',
        author TEXT,
        author_image TEXT,
        content TEXT
      )
    `);

    // Migrate older databases that lack the new columns
    const columns = db
      .prepare("PRAGMA table_info(items)")
      .all() as { name: string }[];
    const colNames = new Set(columns.map((c) => c.name));
    if (!colNames.has("item_type")) {
      db.exec("ALTER TABLE items ADD COLUMN item_type TEXT DEFAULT 'article'");
    }
    if (!colNames.has("author")) {
      db.exec("ALTER TABLE items ADD COLUMN author TEXT");
    }
    if (!colNames.has("author_image")) {
      db.exec("ALTER TABLE items ADD COLUMN author_image TEXT");
    }
    if (!colNames.has("content")) {
      db.exec("ALTER TABLE items ADD COLUMN content TEXT");
    }
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
  item_type: string;
  author: string | null;
  author_image: string | null;
  content: string | null;
}

export function getAllItems(): ReadingItem[] {
  return getDb()
    .prepare("SELECT * FROM items ORDER BY created_at DESC")
    .all() as ReadingItem[];
}

export function addItem(data: {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  item_type: string;
  author: string | null;
  author_image: string | null;
  content: string | null;
}): ReadingItem {
  const stmt = getDb().prepare(
    `INSERT INTO items (url, title, description, image, source, item_type, author, author_image, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    data.url,
    data.title,
    data.description,
    data.image,
    data.source,
    data.item_type,
    data.author,
    data.author_image,
    data.content
  );
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
