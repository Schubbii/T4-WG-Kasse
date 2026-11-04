import type { ExpenseInput } from "../domain/types.ts";
import { AppError, notFound } from "../http/errors.ts";
import type { ExpenseRepository, MemberRepository } from "../repositories/types.ts";

export function createExpenseService(expenses: ExpenseRepository, members: MemberRepository) {
  /** Fachliche Prüfung: Zahler und alle Beteiligten müssen existieren. */
  async function ensureMembersExist(input: ExpenseInput) {
    const ids = new Set([input.paidBy, ...input.participants]);
    for (const id of ids) {
      if (!(await members.get(id))) {
        throw new AppError(422, "UNKNOWN_MEMBER", `Mitglied mit ID ${id} existiert nicht`);
      }
    }
  }

  return {
    list: () => expenses.list(),

    async get(id: number) {
      const expense = await expenses.get(id);
      if (!expense) throw notFound("Ausgabe");
      return expense;
    },

    async create(input: ExpenseInput) {
      await ensureMembersExist(input);
      return expenses.create(input);
    },

    async update(id: number, input: ExpenseInput) {
      if (!(await expenses.get(id))) throw notFound("Ausgabe");
      await ensureMembersExist(input);
      return (await expenses.update(id, input))!;
    },

    async delete(id: number) {
      if (!(await expenses.delete(id))) throw notFound("Ausgabe");
    },
  };
}

export type ExpenseService = ReturnType<typeof createExpenseService>;
