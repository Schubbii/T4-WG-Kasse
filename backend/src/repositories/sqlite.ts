// SQLite-Umsetzung der Repository-Interfaces.
// Hier steht das einzige SQL der Anwendung.
//
// node:sqlite arbeitet synchron, die Interfaces sind aber bewusst async
// (damit z. B. Deno KV sie auch erfüllen könnte). Daher enthalten die
// async-Methoden hier kein await. Das ist gewollt.
// deno-lint-ignore-file require-await

import { type Database, transaction } from "../db.ts";
import type {
  Expense,
  ExpenseInput,
  Member,
  Settlement,
  SettlementInput,
} from "../domain/types.ts";
import type {
  ExpenseRepository,
  MemberRepository,
  Repositories,
  SettlementRepository,
} from "./types.ts";

type Row = Record<string, unknown>;

const toMember = (r: Row): Member => ({ id: Number(r.id), name: String(r.name) });

const toSettlement = (r: Row): Settlement => ({
  id: Number(r.id),
  fromId: Number(r.from_member),
  toId: Number(r.to_member),
  amountCents: Number(r.amount_cents),
  date: String(r.date),
});

function memberRepository(db: Database): MemberRepository {
  return {
    async list() {
      return db.prepare("SELECT id, name FROM members ORDER BY name").all().map(toMember);
    },
    async get(id) {
      const row = db.prepare("SELECT id, name FROM members WHERE id = ?").get(id);
      return row ? toMember(row) : undefined;
    },
    async findByName(name) {
      const row = db.prepare("SELECT id, name FROM members WHERE name = ?").get(name);
      return row ? toMember(row) : undefined;
    },
    async create(name) {
      const { lastInsertRowid } = db.prepare("INSERT INTO members (name) VALUES (?)").run(name);
      return { id: Number(lastInsertRowid), name };
    },
    async rename(id, name) {
      const { changes } = db.prepare("UPDATE members SET name = ? WHERE id = ?").run(name, id);
      return changes > 0 ? { id, name } : undefined;
    },
    async delete(id) {
      return db.prepare("DELETE FROM members WHERE id = ?").run(id).changes > 0;
    },
    async isReferenced(id) {
      const row = db.prepare(`
        SELECT EXISTS (SELECT 1 FROM expenses WHERE paid_by = :id)
            OR EXISTS (SELECT 1 FROM expense_participants WHERE member_id = :id)
            OR EXISTS (SELECT 1 FROM settlements WHERE from_member = :id OR to_member = :id)
          AS used
      `).get({ id });
      return Number(row?.used) === 1;
    },
  };
}

function expenseRepository(db: Database): ExpenseRepository {
  // Lädt die Beteiligten und baut Expense-Objekte.
  // Mit onlyExpenseId werden nur die Beteiligten dieser einen Ausgabe geladen.
  function withParticipants(rows: Row[], onlyExpenseId?: number): Expense[] {
    const participantRows = onlyExpenseId === undefined
      ? db.prepare("SELECT expense_id, member_id FROM expense_participants ORDER BY member_id")
        .all()
      : db
        .prepare(
          "SELECT expense_id, member_id FROM expense_participants WHERE expense_id = ? ORDER BY member_id",
        )
        .all(onlyExpenseId);
    const participants = new Map<number, number[]>();
    for (const p of participantRows) {
      const list = participants.get(Number(p.expense_id)) ?? [];
      list.push(Number(p.member_id));
      participants.set(Number(p.expense_id), list);
    }
    return rows.map((r) => ({
      id: Number(r.id),
      description: String(r.description),
      amountCents: Number(r.amount_cents),
      date: String(r.date),
      paidBy: Number(r.paid_by),
      participants: participants.get(Number(r.id)) ?? [],
    }));
  }

  function insertParticipants(expenseId: number, memberIds: number[]) {
    const stmt = db.prepare(
      "INSERT INTO expense_participants (expense_id, member_id) VALUES (?, ?)",
    );
    for (const memberId of memberIds) stmt.run(expenseId, memberId);
  }

  const repo: ExpenseRepository = {
    async list() {
      const rows = db.prepare("SELECT * FROM expenses ORDER BY date DESC, id DESC").all();
      return withParticipants(rows);
    },
    async get(id) {
      const row = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
      return row ? withParticipants([row], id)[0] : undefined;
    },
    async create(input) {
      const id = transaction(db, () => {
        const { lastInsertRowid } = db
          .prepare(
            "INSERT INTO expenses (description, amount_cents, date, paid_by) VALUES (?, ?, ?, ?)",
          )
          .run(input.description, input.amountCents, input.date, input.paidBy);
        insertParticipants(Number(lastInsertRowid), input.participants);
        return Number(lastInsertRowid);
      });
      return (await repo.get(id))!;
    },
    async update(id, input: ExpenseInput) {
      const found = transaction(db, () => {
        const { changes } = db
          .prepare(
            "UPDATE expenses SET description = ?, amount_cents = ?, date = ?, paid_by = ? WHERE id = ?",
          )
          .run(input.description, input.amountCents, input.date, input.paidBy, id);
        if (changes === 0) return false;
        db.prepare("DELETE FROM expense_participants WHERE expense_id = ?").run(id);
        insertParticipants(id, input.participants);
        return true;
      });
      return found ? await repo.get(id) : undefined;
    },
    async delete(id) {
      // Beteiligte werden per ON DELETE CASCADE mitgelöscht.
      return db.prepare("DELETE FROM expenses WHERE id = ?").run(id).changes > 0;
    },
  };
  return repo;
}

function settlementRepository(db: Database): SettlementRepository {
  return {
    async list() {
      return db.prepare("SELECT * FROM settlements ORDER BY date DESC, id DESC").all().map(
        toSettlement,
      );
    },
    async create(input: SettlementInput) {
      const { lastInsertRowid } = db
        .prepare(
          "INSERT INTO settlements (from_member, to_member, amount_cents, date) VALUES (?, ?, ?, ?)",
        )
        .run(input.fromId, input.toId, input.amountCents, input.date);
      return { id: Number(lastInsertRowid), ...input };
    },
    async delete(id) {
      return db.prepare("DELETE FROM settlements WHERE id = ?").run(id).changes > 0;
    },
  };
}

export function createSqliteRepositories(db: Database): Repositories {
  return {
    members: memberRepository(db),
    expenses: expenseRepository(db),
    settlements: settlementRepository(db),
  };
}
