// Endpunkte für Rückzahlungen: /api/settlements

import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import {
  addSettlement,
  deleteSettlement,
  getMember,
  getSettlement,
  getSettlements,
} from "../database.ts";
import { onInvalid, settlementSchema } from "../schemas.ts";

export const settlementRoutes = new Hono();

// Alle Rückzahlungen auflisten
settlementRoutes.get("/", (c) => {
  return c.json(getSettlements());
});

// Neue Rückzahlung speichern
settlementRoutes.post("/", zValidator("json", settlementSchema, onInvalid), (c) => {
  const data = c.req.valid("json");

  if (data.fromId === data.toId) {
    throw new HTTPException(400, { message: "Man kann sich nicht selbst Geld zahlen" });
  }
  if (!getMember(data.fromId) || !getMember(data.toId)) {
    throw new HTTPException(400, { message: "Mitglied existiert nicht" });
  }

  const settlement = addSettlement(data);
  return c.json(settlement, 201);
});

// Rückzahlung löschen
settlementRoutes.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (!getSettlement(id)) {
    throw new HTTPException(404, { message: "Rückzahlung nicht gefunden" });
  }
  deleteSettlement(id);
  return c.body(null, 204);
});
