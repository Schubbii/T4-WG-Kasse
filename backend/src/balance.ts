// Die Rechenlogik der WG-Kasse: aufteilen, Salden berechnen, Ausgleich vorschlagen.
// Hier gibt es keine Datenbank und kein HTTP. Darum lässt sich alles leicht testen.

import type { Balance, Expense, Member, Settlement, Suggestion } from "./types.ts";

// Teilt einen Betrag gleichmäßig auf.
// Beispiel: 1000 Cent auf 3 Personen ergibt 334, 333 und 333.
// Die Rest-Cent bekommen die ersten Personen in der Liste (sortiert nach ID).
export function splitAmount(amountCents: number, participantIds: number[]): Map<number, number> {
  const sortedIds = [...participantIds].sort((a, b) => a - b);
  const count = sortedIds.length;
  const base = Math.floor(amountCents / count);
  const rest = amountCents % count;

  const shares = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const extraCent = i < rest ? 1 : 0;
    shares.set(sortedIds[i], base + extraCent);
  }
  return shares;
}

// Berechnet für jedes Mitglied den Saldo.
// Saldo = bezahlt - eigener Anteil + zurückgezahlt - zurückbekommen
export function computeBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[],
): Balance[] {
  const balances: Balance[] = members.map((member) => ({
    memberId: member.id,
    name: member.name,
    paidCents: 0,
    shareCents: 0,
    balanceCents: 0,
  }));

  // Sucht den Eintrag eines Mitglieds in der Liste.
  const find = (id: number) => balances.find((b) => b.memberId === id);

  for (const expense of expenses) {
    const payer = find(expense.paidBy);
    if (payer) payer.paidCents += expense.amountCents;

    const shares = splitAmount(expense.amountCents, expense.participants);
    for (const [memberId, share] of shares) {
      const participant = find(memberId);
      if (participant) participant.shareCents += share;
    }
  }

  for (const b of balances) {
    b.balanceCents = b.paidCents - b.shareCents;
  }

  // Wer zurückzahlt, hat danach weniger Schulden.
  // Wer Geld zurückbekommt, hat danach weniger Guthaben.
  for (const s of settlements) {
    const from = find(s.fromId);
    const to = find(s.toId);
    if (from) from.balanceCents += s.amountCents;
    if (to) to.balanceCents -= s.amountCents;
  }

  return balances;
}

// Schlägt Überweisungen vor, damit am Ende alle Salden 0 sind.
// Vorgehen: Wer am meisten schuldet, zahlt an den, der am meisten bekommt.
// Das wird wiederholt, bis niemand mehr Schulden hat.
export function suggestSettlements(balances: Balance[]): Suggestion[] {
  // Kopien anlegen, damit die Original-Salden nicht verändert werden.
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ id: b.memberId, amount: b.balanceCents }));
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ id: b.memberId, amount: -b.balanceCents }));

  // Größte Beträge zuerst
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggestions: Suggestion[] = [];
  let c = 0; // Position in der Gläubiger-Liste
  let d = 0; // Position in der Schuldner-Liste

  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c];
    const debtor = debtors[d];
    const amount = Math.min(creditor.amount, debtor.amount);

    suggestions.push({ fromId: debtor.id, toId: creditor.id, amountCents: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;

    // Wer ausgeglichen ist, ist fertig. Dann kommt der Nächste dran.
    if (creditor.amount === 0) c++;
    if (debtor.amount === 0) d++;
  }

  return suggestions;
}
