// Alles, was mit der Datenbank zu tun hat. Nur in dieser Datei steht SQL.
// SQLite ist in Deno eingebaut (Modul "node:sqlite"), wir brauchen keine Zusatzbibliothek.
//
// Datentrennung: Jede WG hat ein eigenes Benutzerkonto (Tabelle "users").
// Mitglieder, Ausgaben und Rückzahlungen gehören zu genau einem Konto (Spalte "userId").
// Jede Funktion bekommt die userId und liest oder ändert nur Daten dieses Kontos.

import { DatabaseSync } from "node:sqlite";
import type { Expense, Member, Settlement, User } from "./types.ts";

// Die Spalten heißen genauso wie die Felder in types.ts.
// So passen die Zeilen aus der Datenbank direkt zu unseren Typen.
const CREATE_TABLES = `
  -- Ein Benutzerkonto pro WG. Das Passwort wird nur als Hash gespeichert.
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    passwordHash TEXT NOT NULL
  );

  -- Angemeldete Browser. Die id ist eine zufällige Zeichenkette und steht im Cookie.
  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT    PRIMARY KEY,
    userId    INTEGER NOT NULL REFERENCES users(id),
    createdAt INTEGER NOT NULL -- Zeitpunkt in Millisekunden
  );

  CREATE TABLE IF NOT EXISTS members (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    name   TEXT    NOT NULL COLLATE NOCASE,
    UNIQUE (userId, name) -- Namen sind nur innerhalb einer WG eindeutig
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES users(id),
    description TEXT    NOT NULL,
    amountCents INTEGER NOT NULL CHECK (amountCents > 0),
    date        TEXT    NOT NULL,
    paidBy      INTEGER NOT NULL REFERENCES members(id)
  );

  -- Zwischentabelle: Welche Mitglieder sind an welcher Ausgabe beteiligt?
  CREATE TABLE IF NOT EXISTS expense_participants (
    expenseId INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    memberId  INTEGER NOT NULL REFERENCES members(id),
    PRIMARY KEY (expenseId, memberId)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL REFERENCES users(id),
    fromId      INTEGER NOT NULL REFERENCES members(id),
    toId        INTEGER NOT NULL REFERENCES members(id),
    amountCents INTEGER NOT NULL CHECK (amountCents > 0),
    date        TEXT    NOT NULL
  );
`;

let db: DatabaseSync;

// Öffnet die Datenbank-Datei und legt die Tabellen an, falls sie fehlen.
// Mit ":memory:" liegt die Datenbank nur im Arbeitsspeicher (für Tests).
export function openDatabase(path: string) {
  db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON"); // Fremdschlüssel prüfen lassen
  db.exec(CREATE_TABLES);
}

// Die Datenbank liefert jede Zeile als Objekt mit unbekannten Werten.
// Diese Funktionen machen daraus unsere Typen (Zahlen als number, Texte als string).
type Row = Record<string, unknown>;

function toMember(row: Row): Member {
  return { id: Number(row.id), name: String(row.name) };
}

function toExpense(row: Row): Expense {
  const id = Number(row.id);
  return {
    id: id,
    description: String(row.description),
    amountCents: Number(row.amountCents),
    date: String(row.date),
    paidBy: Number(row.paidBy),
    participants: getParticipants(id),
  };
}

function toSettlement(row: Row): Settlement {
  return {
    id: Number(row.id),
    fromId: Number(row.fromId),
    toId: Number(row.toId),
    amountCents: Number(row.amountCents),
    date: String(row.date),
  };
}

// ---------- Benutzer und Sessions ----------

// Gibt Benutzer samt Passwort-Hash zurück (nur für die Anmeldung).
export function findUserByName(
  username: string,
): { id: number; username: string; passwordHash: string } | undefined {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!row) return undefined;
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.passwordHash),
  };
}

export function addUser(username: string, passwordHash: string): User {
  const result = db
    .prepare("INSERT INTO users (username, passwordHash) VALUES (?, ?)")
    .run(username, passwordHash);
  return { id: Number(result.lastInsertRowid), username };
}

export function addSession(sessionId: string, userId: number) {
  db.prepare("INSERT INTO sessions (id, userId, createdAt) VALUES (?, ?, ?)")
    .run(sessionId, userId, Date.now());
}

// Sucht die Session und den Benutzer dazu (JOIN verbindet beide Tabellen).
export function getSession(
  sessionId: string,
): { user: User; createdAt: number } | undefined {
  const row = db.prepare(`
    SELECT users.id, users.username, sessions.createdAt
    FROM sessions JOIN users ON users.id = sessions.userId
    WHERE sessions.id = ?
  `).get(sessionId);
  if (!row) return undefined;
  return {
    user: { id: Number(row.id), username: String(row.username) },
    createdAt: Number(row.createdAt),
  };
}

export function deleteSession(sessionId: string) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

// ---------- Mitglieder ----------

export function getMembers(userId: number): Member[] {
  const rows = db.prepare("SELECT * FROM members WHERE userId = ? ORDER BY name").all(userId);
  return rows.map(toMember);
}

export function getMember(userId: number, id: number): Member | undefined {
  const row = db.prepare("SELECT * FROM members WHERE userId = ? AND id = ?").get(userId, id);
  return row ? toMember(row) : undefined;
}

// Groß- und Kleinschreibung zählt nicht (COLLATE NOCASE in der Tabelle).
export function findMemberByName(userId: number, name: string): Member | undefined {
  const row = db.prepare("SELECT * FROM members WHERE userId = ? AND name = ?").get(userId, name);
  return row ? toMember(row) : undefined;
}

export function addMember(userId: number, name: string): Member {
  const result = db.prepare("INSERT INTO members (userId, name) VALUES (?, ?)").run(userId, name);
  return { id: Number(result.lastInsertRowid), name };
}

export function renameMember(userId: number, id: number, name: string) {
  db.prepare("UPDATE members SET name = ? WHERE userId = ? AND id = ?").run(name, userId, id);
}

export function deleteMember(userId: number, id: number) {
  db.prepare("DELETE FROM members WHERE userId = ? AND id = ?").run(userId, id);
}

// Kommt das Mitglied in einer Ausgabe oder Rückzahlung vor?
// Die Mitglieds-ID ist eindeutig, deshalb braucht es hier keine userId.
export function isMemberUsed(id: number): boolean {
  const asPayer = db.prepare("SELECT 1 FROM expenses WHERE paidBy = ?").get(id);
  const asParticipant = db.prepare("SELECT 1 FROM expense_participants WHERE memberId = ?").get(id);
  const inSettlement = db.prepare("SELECT 1 FROM settlements WHERE fromId = ? OR toId = ?").get(
    id,
    id,
  );
  return asPayer !== undefined || asParticipant !== undefined || inSettlement !== undefined;
}

// ---------- Ausgaben ----------

// Holt die IDs der Beteiligten einer Ausgabe aus der Zwischentabelle.
function getParticipants(expenseId: number): number[] {
  const rows = db
    .prepare("SELECT memberId FROM expense_participants WHERE expenseId = ? ORDER BY memberId")
    .all(expenseId);
  return rows.map((row) => Number(row.memberId));
}

function saveParticipants(expenseId: number, participants: number[]) {
  for (const memberId of participants) {
    db.prepare("INSERT INTO expense_participants (expenseId, memberId) VALUES (?, ?)")
      .run(expenseId, memberId);
  }
}

export function getExpenses(userId: number): Expense[] {
  const rows = db
    .prepare("SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, id DESC")
    .all(userId);
  return rows.map(toExpense);
}

export function getExpense(userId: number, id: number): Expense | undefined {
  const row = db.prepare("SELECT * FROM expenses WHERE userId = ? AND id = ?").get(userId, id);
  return row ? toExpense(row) : undefined;
}

// Eine Ausgabe besteht aus einer Zeile in "expenses" und mehreren Zeilen in
// "expense_participants". Die Transaktion sorgt dafür, dass entweder alles
// oder nichts gespeichert wird.
export function addExpense(userId: number, data: Omit<Expense, "id">): Expense {
  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        "INSERT INTO expenses (userId, description, amountCents, date, paidBy) VALUES (?, ?, ?, ?, ?)",
      )
      .run(userId, data.description, data.amountCents, data.date, data.paidBy);
    const id = Number(result.lastInsertRowid);
    saveParticipants(id, data.participants);
    db.exec("COMMIT");
    return { id, ...data };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function updateExpense(userId: number, id: number, data: Omit<Expense, "id">): Expense {
  db.exec("BEGIN");
  try {
    db.prepare(
      "UPDATE expenses SET description = ?, amountCents = ?, date = ?, paidBy = ? WHERE userId = ? AND id = ?",
    ).run(data.description, data.amountCents, data.date, data.paidBy, userId, id);
    // Alte Beteiligte löschen und die neuen speichern
    db.prepare("DELETE FROM expense_participants WHERE expenseId = ?").run(id);
    saveParticipants(id, data.participants);
    db.exec("COMMIT");
    return { id, ...data };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

// Die Beteiligten werden automatisch mitgelöscht (ON DELETE CASCADE).
export function deleteExpense(userId: number, id: number) {
  db.prepare("DELETE FROM expenses WHERE userId = ? AND id = ?").run(userId, id);
}

// ---------- Rückzahlungen ----------

export function getSettlements(userId: number): Settlement[] {
  const rows = db
    .prepare("SELECT * FROM settlements WHERE userId = ? ORDER BY date DESC, id DESC")
    .all(userId);
  return rows.map(toSettlement);
}

export function getSettlement(userId: number, id: number): Settlement | undefined {
  const row = db.prepare("SELECT * FROM settlements WHERE userId = ? AND id = ?").get(userId, id);
  return row ? toSettlement(row) : undefined;
}

export function addSettlement(userId: number, data: Omit<Settlement, "id">): Settlement {
  const result = db
    .prepare(
      "INSERT INTO settlements (userId, fromId, toId, amountCents, date) VALUES (?, ?, ?, ?, ?)",
    )
    .run(userId, data.fromId, data.toId, data.amountCents, data.date);
  return { id: Number(result.lastInsertRowid), ...data };
}

export function deleteSettlement(userId: number, id: number) {
  db.prepare("DELETE FROM settlements WHERE userId = ? AND id = ?").run(userId, id);
}
