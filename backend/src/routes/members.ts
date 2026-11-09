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

export const memberRoutes = new Hono();

// Alle Mitglieder auflisten
memberRoutes.get("/", (c) => {
  return c.json(getMembers());
});

// Neues Mitglied anlegen
memberRoutes.post("/", zValidator("json", memberSchema, onInvalid), (c) => {
  const { name } = c.req.valid("json");

  if (findMemberByName(name)) {
    throw new HTTPException(409, { message: `Es gibt schon ein Mitglied namens "${name}"` });
  }

  const member = addMember(name);
  return c.json(member, 201);
});

// Mitglied umbenennen
memberRoutes.patch("/:id", zValidator("json", memberSchema, onInvalid), (c) => {
  const id = Number(c.req.param("id"));
  const { name } = c.req.valid("json");

  if (!getMember(id)) {
    throw new HTTPException(404, { message: "Mitglied nicht gefunden" });
  }
  const sameName = findMemberByName(name);
  if (sameName && sameName.id !== id) {
    throw new HTTPException(409, { message: `Es gibt schon ein Mitglied namens "${name}"` });
  }

  renameMember(id, name);
  return c.json({ id, name });
});

// Mitglied löschen
memberRoutes.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));

  if (!getMember(id)) {
    throw new HTTPException(404, { message: "Mitglied nicht gefunden" });
  }
  // Sonst würden sich die Salden der anderen nachträglich ändern.
  if (isMemberUsed(id)) {
    throw new HTTPException(409, {
      message: "Mitglied kommt in Ausgaben oder Rückzahlungen vor und kann nicht gelöscht werden",
    });
  }

  deleteMember(id);
  return c.body(null, 204);
});
