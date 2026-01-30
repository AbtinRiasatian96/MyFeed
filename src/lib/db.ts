import initSqlJs from "sql.js";
import type { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "myfeed.db");

let db: SqlJsDatabase | null = null;
let dbReady: Promise<SqlJsDatabase> | null = null;

function getDbPromise(): Promise<SqlJsDatabase> {
  if (!dbReady) {
    dbReady = (async () => {
      const SQL = await initSqlJs();

      let fileBuffer: Buffer | undefined;
      try {
        fileBuffer = fs.readFileSync(DB_PATH);
      } catch {
        // No existing DB file — will create a new one
      }

      db = new SQL.Database(fileBuffer);

      db.run(`
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

      save();
      return db;
    })();
  }
  return dbReady;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
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

function rowToItem(row: Record<string, unknown>): ReadingItem {
  return {
    id: row.id as number,
    url: row.url as string,
    title: (row.title as string) || null,
    description: (row.description as string) || null,
    image: (row.image as string) || null,
    source: (row.source as string) || null,
    is_read: (row.is_read as number) || 0,
    created_at: (row.created_at as string) || "",
    item_type: (row.item_type as string) || "article",
    author: (row.author as string) || null,
    author_image: (row.author_image as string) || null,
    content: (row.content as string) || null,
  };
}

function queryAll(database: SqlJsDatabase, sql: string, params?: unknown[]): ReadingItem[] {
  const stmt = database.prepare(sql);
  if (params) stmt.bind(params);
  const results: ReadingItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(rowToItem(row));
  }
  stmt.free();
  return results;
}

export async function getAllItems(): Promise<ReadingItem[]> {
  const database = await getDbPromise();
  return queryAll(database, "SELECT * FROM items ORDER BY created_at DESC");
}

export async function addItem(data: {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  source: string | null;
  item_type: string;
  author: string | null;
  author_image: string | null;
  content: string | null;
}): Promise<ReadingItem> {
  const database = await getDbPromise();
  database.run(
    `INSERT INTO items (url, title, description, image, source, item_type, author, author_image, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.url,
      data.title,
      data.description,
      data.image,
      data.source,
      data.item_type,
      data.author,
      data.author_image,
      data.content,
    ]
  );
  save();

  const lastId = database.exec("SELECT last_insert_rowid() as id")[0].values[0][0] as number;
  const rows = queryAll(database, "SELECT * FROM items WHERE id = ?", [lastId]);
  return rows[0];
}

export async function toggleRead(id: number): Promise<ReadingItem | undefined> {
  const database = await getDbPromise();
  database.run(
    "UPDATE items SET is_read = CASE WHEN is_read = 0 THEN 1 ELSE 0 END WHERE id = ?",
    [id]
  );
  save();
  const rows = queryAll(database, "SELECT * FROM items WHERE id = ?", [id]);
  return rows[0];
}

export async function deleteItem(id: number): Promise<void> {
  const database = await getDbPromise();
  database.run("DELETE FROM items WHERE id = ?", [id]);
  save();
}
