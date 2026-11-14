// Endpunkt für die Salden: /api/balances
// Die Salden werden nicht gespeichert, sondern bei jeder Anfrage neu berechnet.

import { Hono } from "@hono/hono";
import { computeBalances, suggestSettlements } from "../balance.ts";
import { getExpenses, getMembers, getSettlements } from "../database.ts";
import { type Env, requireLogin } from "../session.ts";

export const balanceRoutes = new Hono<Env>();

balanceRoutes.use(requireLogin);

balanceRoutes.get("/", (c) => {
  const userId = c.get("userId");
  const balances = computeBalances(getMembers(userId), getExpenses(userId), getSettlements(userId));
  const suggestions = suggestSettlements(balances);
  return c.json({ balances, suggestions });
});
