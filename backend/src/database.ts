// Alles, was mit der Datenbank zu tun hat. Nur in dieser Datei steht SQL.
// SQLite ist in Deno eingebaut (Modul "node:sqlite"), wir brauchen keine Zusatzbibliothek.

import { DatabaseSync } from "node:sqlite";
import type { Expense, Member, Settlement } from "./types.ts";

// Die Spalten heißen genauso wie die Felder in types.ts.
// So passen die Zeilen aus der Datenbank direkt zu unseren Typen.
const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS members (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
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
    fromId      INTEGER NOT NULL REFERENCES members(id),
    toId        INTEGER NOT NULL REFERENCES members(id),
    amountCents INTEGER NOT NULL CHECK (amountCents > 0),
    date        TEXT    NOT NULL
  );
`;

let db: DatabaseSync;

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

// Öffnet die Datenbank-Datei und legt die Tabellen an, falls sie fehlen.
// Mit ":memory:" liegt die Datenbank nur im Arbeitsspeicher (für Tests).
export function openDatabase(path: string) {
  db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON"); // Fremdschlüssel prüfen lassen
  db.exec(CREATE_TABLES);
}

// ---------- Mitglieder ----------

export function getMembers(): Member[] {
  const rows = db.prepare("SELECT * FROM members ORDER BY name").all();
  return rows.map(toMember);
}

export function getMember(id: number): Member | undefined {
  const row = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
  return row ? toMember(row) : undefined;
}

// Groß- und Kleinschreibung zählt nicht (COLLATE NOCASE in der Tabelle).
export function findMemberByName(name: string): Member | undefined {
  const row = db.prepare("SELECT * FROM members WHERE name = ?").get(name);
  return row ? toMember(row) : undefined;
}

export function addMember(name: string): Member {
  const result = db.prepare("INSERT INTO members (name) VALUES (?)").run(name);
  return { id: Number(result.lastInsertRowid), name };
}

export function renameMember(id: number, name: string) {
  db.prepare("UPDATE members SET name = ? WHERE id = ?").run(name, id);
}

export function deleteMember(id: number) {
  db.prepare("DELETE FROM members WHERE id = ?").run(id);
}

// Kommt das Mitglied in einer Ausgabe oder Rückzahlung vor?
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

export function getExpenses(): Expense[] {
  const rows = db.prepare("SELECT * FROM expenses ORDER BY date DESC, id DESC").all();
  return rows.map(toExpense);
}

export function getExpense(id: number): Expense | undefined {
  const row = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
  return row ? toExpense(row) : undefined;
}

// Eine Ausgabe besteht aus einer Zeile in "expenses" und mehreren Zeilen in
// "expense_participants". Die Transaktion sorgt dafür, dass entweder alles
// oder nichts gespeichert wird.
export function addExpense(data: Omit<Expense, "id">): Expense {
  db.exec("BEGIN");
  try {
    const result = db
      .prepare("INSERT INTO expenses (description, amountCents, date, paidBy) VALUES (?, ?, ?, ?)")
      .run(data.description, data.amountCents, data.date, data.paidBy);
    const id = Number(result.lastInsertRowid);
    saveParticipants(id, data.participants);
    db.exec("COMMIT");
    return { id, ...data };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function updateExpense(id: number, data: Omit<Expense, "id">): Expense {
  db.exec("BEGIN");
  try {
    db.prepare(
      "UPDATE expenses SET description = ?, amountCents = ?, date = ?, paidBy = ? WHERE id = ?",
    )
      .run(data.description, data.amountCents, data.date, data.paidBy, id);
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
export function deleteExpense(id: number) {
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
}

// ---------- Rückzahlungen ----------

export function getSettlements(): Settlement[] {
  const rows = db.prepare("SELECT * FROM settlements ORDER BY date DESC, id DESC").all();
  return rows.map(toSettlement);
}

export function getSettlement(id: number): Settlement | undefined {
  const row = db.prepare("SELECT * FROM settlements WHERE id = ?").get(id);
  return row ? toSettlement(row) : undefined;
}

export function addSettlement(data: Omit<Settlement, "id">): Settlement {
  const result = db
    .prepare("INSERT INTO settlements (fromId, toId, amountCents, date) VALUES (?, ?, ?, ?)")
    .run(data.fromId, data.toId, data.amountCents, data.date);
  return { id: Number(result.lastInsertRowid), ...data };
}

export function deleteSettlement(id: number) {
  db.prepare("DELETE FROM settlements WHERE id = ?").run(id);
}
