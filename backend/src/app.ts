// Die Hono-App: verbindet alle Routen und behandelt Fehler an einer Stelle.

import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { authRoutes } from "./routes/auth.ts";
import { balanceRoutes } from "./routes/balances.ts";
import { expenseRoutes } from "./routes/expenses.ts";
import { memberRoutes } from "./routes/members.ts";
import { settlementRoutes } from "./routes/settlements.ts";

export const app = new Hono();

app.route("/api/auth", authRoutes); // ohne Login erreichbar
app.route("/api/members", memberRoutes); // ab hier nur mit Login (requireLogin in den Dateien)
app.route("/api/expenses", expenseRoutes);
app.route("/api/settlements", settlementRoutes);
app.route("/api/balances", balanceRoutes);

// Unbekannte API-Adresse
app.all("/api/*", (c) => {
  return c.json({ error: "Endpunkt nicht gefunden" }, 404);
});

// Zentrale Fehlerbehandlung. Jeder Fehler wird zu einer JSON-Antwort:
// { "error": "Fehlermeldung" }
app.onError((error, c) => {
  if (error instanceof HTTPException) {
    // Fehler, die wir selbst mit "throw new HTTPException(...)" auslösen
    return c.json({ error: error.message }, error.status);
  }
  // Unerwarteter Fehler: im Terminal ausgeben, dem Nutzer nur eine allgemeine Meldung zeigen
  console.error(error);
  return c.json({ error: "Interner Serverfehler" }, 500);
});
