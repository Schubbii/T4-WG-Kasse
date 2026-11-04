// SQLite über das in Deno eingebaute Modul node:sqlite (ab Deno 2.2).
// Keine Zusatzbibliothek nötig, siehe docs/adr/0001-persistenz-sqlite.md.

import { DatabaseSync } from "node:sqlite";

export type Database = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  description  TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date         TEXT    NOT NULL,
  paid_by      INTEGER NOT NULL REFERENCES members(id)
);

-- n:m-Beziehung: welche Mitglieder an einer Ausgabe beteiligt sind
CREATE TABLE IF NOT EXISTS expense_participants (
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id  INTEGER NOT NULL REFERENCES members(id),
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  from_member  INTEGER NOT NULL REFERENCES members(id),
  to_member    INTEGER NOT NULL REFERENCES members(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date         TEXT    NOT NULL,
  CHECK (from_member <> to_member)
);
`;

/** Öffnet die Datenbank und legt die Tabellen an, falls sie fehlen. ":memory:" für Tests. */
export function openDatabase(path: string): Database {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

/** Führt fn in einer Transaktion aus: entweder alles oder nichts. */
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
