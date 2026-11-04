import { assertEquals, assertThrows } from "@std/assert";
import { computeBalances, splitAmount, suggestSettlements } from "../src/domain/balance.ts";
import type { Expense, Member, Settlement } from "../src/domain/types.ts";

const members: Member[] = [
  { id: 1, name: "Anna" },
  { id: 2, name: "Ben" },
  { id: 3, name: "Cem" },
];

const expense = (
  id: number,
  amountCents: number,
  paidBy: number,
  participants: number[],
): Expense => ({
  id,
  description: `Ausgabe ${id}`,
  amountCents,
  date: "2026-11-01",
  paidBy,
  participants,
});

Deno.test("splitAmount teilt gleichmäßig auf", () => {
  assertEquals([...splitAmount(900, [1, 2, 3])], [[1, 300], [2, 300], [3, 300]]);
});

Deno.test("splitAmount verteilt Rest-Cent an die kleinsten IDs", () => {
  const shares = splitAmount(1000, [3, 1, 2]);
  assertEquals(shares.get(1), 334);
  assertEquals(shares.get(2), 333);
  assertEquals(shares.get(3), 333);
  assertEquals([...shares.values()].reduce((a, b) => a + b), 1000);
});

Deno.test("splitAmount ohne Beteiligte wirft Fehler", () => {
  assertThrows(() => splitAmount(100, []));
});

Deno.test("computeBalances: Anna zahlt 30 € für alle drei", () => {
  const balances = computeBalances(members, [expense(1, 3000, 1, [1, 2, 3])], []);
  assertEquals(balances.map((b) => b.balanceCents), [2000, -1000, -1000]);
  assertEquals(balances[0].paidCents, 3000);
  assertEquals(balances[0].shareCents, 1000);
});

Deno.test("computeBalances: Zahler muss nicht beteiligt sein", () => {
  const balances = computeBalances(members, [expense(1, 1000, 1, [2])], []);
  assertEquals(balances.map((b) => b.balanceCents), [1000, -1000, 0]);
});

Deno.test("computeBalances: Rückzahlung gleicht Salden aus", () => {
  const settlements: Settlement[] = [
    { id: 1, fromId: 2, toId: 1, amountCents: 1000, date: "2026-11-02" },
  ];
  const balances = computeBalances(members, [expense(1, 3000, 1, [1, 2, 3])], settlements);
  assertEquals(balances.map((b) => b.balanceCents), [1000, 0, -1000]);
});

Deno.test("computeBalances: Summe aller Salden ist immer 0", () => {
  const expenses = [
    expense(1, 1001, 1, [1, 2, 3]),
    expense(2, 777, 2, [1, 3]),
    expense(3, 5, 3, [1, 2]),
  ];
  const sum = computeBalances(members, expenses, []).reduce((a, b) => a + b.balanceCents, 0);
  assertEquals(sum, 0);
});

Deno.test("suggestSettlements: Schuldner zahlen an Gläubiger", () => {
  const balances = computeBalances(members, [expense(1, 3000, 1, [1, 2, 3])], []);
  assertEquals(suggestSettlements(balances), [
    { fromId: 2, toId: 1, amountCents: 1000 },
    { fromId: 3, toId: 1, amountCents: 1000 },
  ]);
});

Deno.test("suggestSettlements: nach Ausführung sind alle Salden 0", () => {
  const expenses = [
    expense(1, 1001, 1, [1, 2, 3]),
    expense(2, 777, 2, [1, 3]),
    expense(3, 5, 3, [1, 2]),
  ];
  const balances = computeBalances(members, expenses, []);
  const settlements = suggestSettlements(balances).map((s, i) => ({
    id: i + 1,
    date: "2026-11-03",
    ...s,
  }));
  const after = computeBalances(members, expenses, settlements);
  assertEquals(after.map((b) => b.balanceCents), [0, 0, 0]);
});

Deno.test("suggestSettlements: alles ausgeglichen → keine Vorschläge", () => {
  assertEquals(suggestSettlements(computeBalances(members, [], [])), []);
});
