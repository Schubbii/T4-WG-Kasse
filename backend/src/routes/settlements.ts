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
import { type Env, requireLogin } from "../session.ts";

export const settlementRoutes = new Hono<Env>();

// Alle Routen in dieser Datei brauchen eine Anmeldung.
settlementRoutes.use(requireLogin);

// Alle Rückzahlungen der eigenen WG auflisten
settlementRoutes.get("/", (c) => {
  const userId = c.get("userId");
  return c.json(getSettlements(userId));
});

// Neue Rückzahlung speichern
settlementRoutes.post("/", zValidator("json", settlementSchema, onInvalid), (c) => {
  const userId = c.get("userId");
  const data = c.req.valid("json");

  if (data.fromId === data.toId) {
    throw new HTTPException(400, { message: "Man kann sich nicht selbst Geld zahlen" });
  }
  if (!getMember(userId, data.fromId) || !getMember(userId, data.toId)) {
    throw new HTTPException(400, { message: "Mitglied existiert nicht" });
  }

  const settlement = addSettlement(userId, data);
  return c.json(settlement, 201);
});

// Rückzahlung löschen
settlementRoutes.delete("/:id", (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  if (!getSettlement(userId, id)) {
    throw new HTTPException(404, { message: "Rückzahlung nicht gefunden" });
  }
  deleteSettlement(userId, id);
  return c.body(null, 204);
});
