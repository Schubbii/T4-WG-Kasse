import { computeBalances, suggestSettlements } from "../domain/balance.ts";
import type { BalanceOverview } from "../domain/types.ts";
import type { Repositories } from "../repositories/types.ts";

/**
 * Salden werden nicht gespeichert, sondern bei jeder Anfrage aus den
 * Ausgaben und Zahlungen berechnet. Siehe docs/adr/0003-salden-berechnen-im-backend.md.
 */
export function createBalanceService(repos: Repositories) {
  return {
    async overview(): Promise<BalanceOverview> {
      const [members, expenses, settlements] = await Promise.all([
        repos.members.list(),
        repos.expenses.list(),
        repos.settlements.list(),
      ]);
      const balances = computeBalances(members, expenses, settlements);
      return { balances, suggestions: suggestSettlements(balances) };
    },
  };
}

export type BalanceService = ReturnType<typeof createBalanceService>;
