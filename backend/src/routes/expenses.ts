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
import type { Expense } from "../types.ts";

export const expenseRoutes = new Hono();

// Prüfungen, für die man die Datenbank braucht. Zod kann das nicht prüfen.
function checkExpense(data: Omit<Expense, "id">) {
  const memberIds = [data.paidBy, ...data.participants];
  for (const id of memberIds) {
    if (!getMember(id)) {
      throw new HTTPException(400, { message: `Mitglied mit ID ${id} existiert nicht` });
    }
  }
  // Ein Set enthält jeden Wert nur einmal. Ist es kürzer, gab es doppelte IDs.
  if (new Set(data.participants).size !== data.participants.length) {
    throw new HTTPException(400, { message: "Eine Person ist doppelt ausgewählt" });
  }
}

// Alle Ausgaben auflisten (neueste zuerst)
expenseRoutes.get("/", (c) => {
  return c.json(getExpenses());
});

// Eine Ausgabe anzeigen
expenseRoutes.get("/:id", (c) => {
  const expense = getExpense(Number(c.req.param("id")));
  if (!expense) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  return c.json(expense);
});

// Neue Ausgabe anlegen
expenseRoutes.post("/", zValidator("json", expenseSchema, onInvalid), (c) => {
  const data = c.req.valid("json");
  checkExpense(data);
  const expense = addExpense(data);
  return c.json(expense, 201);
});

// Ausgabe ändern. PUT, weil das Formular immer alle Felder schickt.
expenseRoutes.put("/:id", zValidator("json", expenseSchema, onInvalid), (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");

  if (!getExpense(id)) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  checkExpense(data);

  const expense = updateExpense(id, data);
  return c.json(expense);
});

// Ausgabe löschen
expenseRoutes.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (!getExpense(id)) {
    throw new HTTPException(404, { message: "Ausgabe nicht gefunden" });
  }
  deleteExpense(id);
  return c.body(null, 204);
});
