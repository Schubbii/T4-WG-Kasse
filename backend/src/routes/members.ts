// Endpunkte für Mitglieder: /api/members

import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import {
  addMember,
  deleteMember,
  findMemberByName,
  getMember,
  getMembers,
  isMemberUsed,
  renameMember,
} from "../database.ts";
import { memberSchema, onInvalid } from "../schemas.ts";
import { type Env, requireLogin } from "../session.ts";

export const memberRoutes = new Hono<Env>();

// Alle Routen in dieser Datei brauchen eine Anmeldung.
memberRoutes.use(requireLogin);

// Alle Mitglieder der eigenen WG auflisten
memberRoutes.get("/", (c) => {
  const userId = c.get("userId");
  return c.json(getMembers(userId));
});

// Neues Mitglied anlegen
memberRoutes.post("/", zValidator("json", memberSchema, onInvalid), (c) => {
  const userId = c.get("userId");
  const { name } = c.req.valid("json");

  if (findMemberByName(userId, name)) {
    throw new HTTPException(409, { message: `Es gibt schon ein Mitglied namens "${name}"` });
  }

  const member = addMember(userId, name);
  return c.json(member, 201);
});

// Mitglied umbenennen
memberRoutes.patch("/:id", zValidator("json", memberSchema, onInvalid), (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  const { name } = c.req.valid("json");

  // Gehört das Mitglied zu einer anderen WG, findet getMember es nicht → 404
  if (!getMember(userId, id)) {
    throw new HTTPException(404, { message: "Mitglied nicht gefunden" });
  }
  const sameName = findMemberByName(userId, name);
  if (sameName && sameName.id !== id) {
    throw new HTTPException(409, { message: `Es gibt schon ein Mitglied namens "${name}"` });
  }

  renameMember(userId, id, name);
  return c.json({ id, name });
});

// Mitglied löschen
memberRoutes.delete("/:id", (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));

  if (!getMember(userId, id)) {
    throw new HTTPException(404, { message: "Mitglied nicht gefunden" });
  }
  // Sonst würden sich die Salden der anderen nachträglich ändern.
  if (isMemberUsed(id)) {
    throw new HTTPException(409, {
      message: "Mitglied kommt in Ausgaben oder Rückzahlungen vor und kann nicht gelöscht werden",
    });
  }

  deleteMember(userId, id);
  return c.body(null, 204);
});
