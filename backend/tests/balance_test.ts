// Tests für die Rechenlogik. Start: deno task test

import { assertEquals } from "@std/assert";
import { computeBalances, splitAmount, suggestSettlements } from "../src/balance.ts";
import type { Expense, Member } from "../src/types.ts";

const members: Member[] = [
  { id: 1, name: "Anna" },
  { id: 2, name: "Ben" },
  { id: 3, name: "Cem" },
];

// Anna bezahlt 30 € für alle drei
const shopping: Expense = {
  id: 1,
  description: "Einkauf",
  amountCents: 3000,
  date: "2026-11-01",
  paidBy: 1,
  participants: [1, 2, 3],
};

Deno.test("splitAmount: 9 € auf 3 Personen sind je 3 €", () => {
  const shares = splitAmount(900, [1, 2, 3]);
  assertEquals(shares.get(1), 300);
  assertEquals(shares.get(2), 300);
  assertEquals(shares.get(3), 300);
});

Deno.test("splitAmount: Rest-Cent bekommen die kleinsten IDs", () => {
  const shares = splitAmount(1000, [3, 1, 2]);
  assertEquals(shares.get(1), 334);
  assertEquals(shares.get(2), 333);
  assertEquals(shares.get(3), 333);
});

Deno.test("computeBalances: Anna bekommt 20 €, Ben und Cem schulden je 10 €", () => {
  const balances = computeBalances(members, [shopping], []);
  assertEquals(balances[0].balanceCents, 2000);
  assertEquals(balances[1].balanceCents, -1000);
  assertEquals(balances[2].balanceCents, -1000);
});

Deno.test("computeBalances: Rückzahlung von Ben gleicht seinen Saldo aus", () => {
  const settlement = { id: 1, fromId: 2, toId: 1, amountCents: 1000, date: "2026-11-02" };
  const balances = computeBalances(members, [shopping], [settlement]);
  assertEquals(balances[0].balanceCents, 1000);
  assertEquals(balances[1].balanceCents, 0);
  assertEquals(balances[2].balanceCents, -1000);
});

Deno.test("computeBalances: Summe aller Salden ist 0, auch mit Rest-Cent", () => {
  const odd = { ...shopping, amountCents: 1001 };
  const balances = computeBalances(members, [odd], []);
  const sum = balances[0].balanceCents + balances[1].balanceCents + balances[2].balanceCents;
  assertEquals(sum, 0);
});

Deno.test("suggestSettlements: Ben und Cem zahlen je 10 € an Anna", () => {
  const balances = computeBalances(members, [shopping], []);
  assertEquals(suggestSettlements(balances), [
    { fromId: 2, toId: 1, amountCents: 1000 },
    { fromId: 3, toId: 1, amountCents: 1000 },
  ]);
});

Deno.test("suggestSettlements: keine Vorschläge, wenn alles ausgeglichen ist", () => {
  const balances = computeBalances(members, [], []);
  assertEquals(suggestSettlements(balances), []);
});
