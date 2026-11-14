// Endpunkte für Ausgaben: /api/expenses

import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import {
  addExpense,
  deleteExpense,
  getExpense,
  getExpenses,
  getMember,
  updateExpense,
} from "../database.ts";
import { expenseSchema, onInvalid } from "../schemas.ts";
import { type Env, requireLogin } from "../session.ts";
import type { Expense } from "../types.ts";

export const expenseRoutes = new Hono<Env>();

// Alle Routen in dieser Datei brauchen eine Anmeldung.
expenseRoutes.use(requireLogin);

// Prüfungen, für die man die Datenbank braucht. Zod kann das nicht prüfen.
function checkExpense(userId: number, data: Omit<Expense, "id">) {
  const memberIds = [data.paidBy, ...data.participants];
  for (const id of memberIds) {
    // getMember findet nur Mitglieder der eigenen WG
    if (!getMember(userId, id)) {
      throw new HTTPException(400, { message: `Mitglied mit ID ${id} existiert nicht` });
    }
  }
  // Ein Set enthält jeden Wert nur einmal. Ist es kürzer, gab es doppelte IDs.
  if (new Set(data.participants).size !== data.participants.length) {
    throw new HTTPException(400, { message: "Eine Person ist doppelt ausgewählt" });
  }
}

// Alle Ausgaben der eigenen WG auflisten (neueste zuerst)
expenseRoutes.get("/", (c) => {
  const userId = c.get("userId");
  return c.json(getExpenses(userId));
});

// Eine Ausgabe anzeigen
expenseRoutes.get("/:id", (c) => {
  const userId = c.get("userId");
  const expense = getExpense(userId, Number(c.req.param("id")));
  if (!expense) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  return c.json(expense);
});

// Neue Ausgabe anlegen
expenseRoutes.post("/", zValidator("json", expenseSchema, onInvalid), (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");
  checkExpense(userId, data);
  const expense = addExpense(userId, data);
  return c.json(expense, 201);
});

// Ausgabe ändern. PUT, weil das Formular immer alle Felder schickt.
expenseRoutes.put("/:id", zValidator("json", expenseSchema, onInvalid), (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");

  if (!getExpense(userId, id)) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  checkExpense(userId, data);

  const expense = updateExpense(userId, id, data);
  return c.json(expense);
});

// Ausgabe löschen
expenseRoutes.delete("/:id", (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  if (!getExpense(userId, id)) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  deleteExpense(userId, id);
  return c.body(null, 204);
});
