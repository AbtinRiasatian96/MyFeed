/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
// Use the pure JS (asm.js) build of sql.js — no WASM file needed
const initSqlJs = require("sql.js/dist/sql-asm.js");
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "myfeed.db");

let db: any = null;
let dbReady: Promise<any> | null = null;

function getDbPromise(): Promise<any> {
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

function str(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (val instanceof Uint8Array) return new TextDecoder().decode(val);
  return String(val);
}

function rowToItem(row: Record<string, unknown>): ReadingItem {
  return {
    id: Number(row.id),
    url: str(row.url) || "",
    title: str(row.title),
    description: str(row.description),
    image: str(row.image),
    source: str(row.source),
    is_read: Number(row.is_read) || 0,
    created_at: str(row.created_at) || "",
    item_type: str(row.item_type) || "article",
    author: str(row.author),
    author_image: str(row.author_image),
    content: str(row.content),
  };
}

function queryAll(database: any, sql: string, params?: unknown[]): ReadingItem[] {
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
