// Reine Geschäftslogik ohne Datenbank und ohne HTTP.
// Dadurch ist sie einfach testbar (siehe tests/balance_test.ts).

import type { Expense, Member, MemberBalance, Settlement, SettlementSuggestion } from "./types.ts";

/**
 * Teilt einen Betrag gleichmäßig auf die Beteiligten auf.
 * Rest-Cent bekommen die Beteiligten mit der kleinsten ID, je 1 Cent.
 * Beispiel: 1000 Cent auf [1, 2, 3] → 1: 334, 2: 333, 3: 333.
 * Die Summe der Anteile ist immer exakt der Betrag.
 */
export function splitAmount(amountCents: number, participantIds: number[]): Map<number, number> {
  if (participantIds.length === 0) {
    throw new Error("Eine Ausgabe braucht mindestens einen Beteiligten");
  }
  const ids = [...participantIds].sort((a, b) => a - b);
  const base = Math.floor(amountCents / ids.length);
  const rest = amountCents % ids.length;

  const shares = new Map<number, number>();
  ids.forEach((id, index) => shares.set(id, base + (index < rest ? 1 : 0)));
  return shares;
}

/**
 * Berechnet für jedes Mitglied den Saldo:
 * bezahlt − eigene Anteile + überwiesen − erhalten.
 * Die Summe aller Salden ist immer 0.
 */
export function computeBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[],
): MemberBalance[] {
  const byId = new Map<number, MemberBalance>();
  for (const m of members) {
    byId.set(m.id, { memberId: m.id, name: m.name, paidCents: 0, shareCents: 0, balanceCents: 0 });
  }

  for (const e of expenses) {
    const payer = byId.get(e.paidBy);
    if (payer) payer.paidCents += e.amountCents;

    for (const [memberId, share] of splitAmount(e.amountCents, e.participants)) {
      const participant = byId.get(memberId);
      if (participant) participant.shareCents += share;
    }
  }

  for (const b of byId.values()) {
    b.balanceCents = b.paidCents - b.shareCents;
  }

  // Wer zurückzahlt, verringert seine Schulden. Wer Geld erhält, hat weniger Guthaben.
  for (const s of settlements) {
    const from = byId.get(s.fromId);
    const to = byId.get(s.toId);
    if (from) from.balanceCents += s.amountCents;
    if (to) to.balanceCents -= s.amountCents;
  }

  return [...byId.values()];
}

/**
 * Schlägt möglichst wenige Überweisungen vor, damit alle Salden 0 werden.
 * Greedy-Verfahren: Der größte Schuldner zahlt an den größten Gläubiger,
 * bis einer der beiden ausgeglichen ist. Dann der nächste.
 */
export function suggestSettlements(balances: MemberBalance[]): SettlementSuggestion[] {
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ id: b.memberId, amount: b.balanceCents }))
    .sort((a, b) => b.amount - a.amount || a.id - b.id);
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ id: b.memberId, amount: -b.balanceCents }))
    .sort((a, b) => b.amount - a.amount || a.id - b.id);

  const suggestions: SettlementSuggestion[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const amount = Math.min(creditors[c].amount, debtors[d].amount);
    suggestions.push({ fromId: debtors[d].id, toId: creditors[c].id, amountCents: amount });
    creditors[c].amount -= amount;
    debtors[d].amount -= amount;
    if (creditors[c].amount === 0) c++;
    if (debtors[d].amount === 0) d++;
  }
  return suggestions;
}
