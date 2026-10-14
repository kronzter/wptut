import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(__dirname, "../../data/watchlist.db");

export class DuplicateError extends Error {
  constructor(noradId) {
    super(`NORAD ${noradId} is already on the watchlist`);
    this.status = 409;
    this.field = "noradId";
  }
}

function toEntry(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    noradId: row.norad_id,
    name: row.name,
    priority: row.priority,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rethrow(err, noradId) {
  if (String(err.message).includes("UNIQUE constraint failed")) throw new DuplicateError(noradId);
  throw err;
}

/**
 * SQL (SQLite) watchlist repository.
 * @param {string} [file] path to the database file, or ":memory:"
 */
export function createSqlWatchlist(file = process.env.SQLITE_FILE || DEFAULT_FILE) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);

  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      norad_id   TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      priority   TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const stmts = {
    list: db.prepare("SELECT * FROM watchlist ORDER BY created_at DESC, id DESC"),
    get: db.prepare("SELECT * FROM watchlist WHERE id = ?"),
    insert: db.prepare(
      `INSERT INTO watchlist (norad_id, name, priority, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ),
    remove: db.prepare("DELETE FROM watchlist WHERE id = ?"),
  };

  const columns = { noradId: "norad_id", name: "name", priority: "priority", note: "note" };

  return {
    kind: "sql",
    engine: "SQLite",

    async list() {
      return stmts.list.all().map(toEntry);
    },

    async get(id) {
      return toEntry(stmts.get.get(Number(id)));
    },

    async create(entry) {
      const now = new Date().toISOString();
      try {
        const info = stmts.insert.run(entry.noradId, entry.name, entry.priority, entry.note, now, now);
        return toEntry(stmts.get.get(Number(info.lastInsertRowid)));
      } catch (err) {
        rethrow(err, entry.noradId);
      }
    },

    async update(id, changes) {
      const keys = Object.keys(changes).filter((k) => k in columns);
      const sets = keys.map((k) => `${columns[k]} = ?`);
      sets.push("updated_at = ?");
      const params = [...keys.map((k) => changes[k]), new Date().toISOString(), Number(id)];
      try {
        const info = db.prepare(`UPDATE watchlist SET ${sets.join(", ")} WHERE id = ?`).run(...params);
        if (info.changes === 0) return null;
      } catch (err) {
        rethrow(err, changes.noradId);
      }
      return toEntry(stmts.get.get(Number(id)));
    },

    async remove(id) {
      return stmts.remove.run(Number(id)).changes > 0;
    },

    async close() {
      db.close();
    },
  };
}
