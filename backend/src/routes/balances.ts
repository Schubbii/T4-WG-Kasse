// Endpunkt für die Salden: /api/balances
// Die Salden werden nicht gespeichert, sondern bei jeder Anfrage neu berechnet.

import { Hono } from "@hono/hono";
import { computeBalances, suggestSettlements } from "../balance.ts";
import { getExpenses, getMembers, getSettlements } from "../database.ts";

export const balanceRoutes = new Hono();

balanceRoutes.get("/", (c) => {
  const balances = computeBalances(getMembers(), getExpenses(), getSettlements());
  const suggestions = suggestSettlements(balances);
  return c.json({ balances, suggestions });
});
