// Endpunkte für die Anmeldung: /api/auth
// Diese Routen sind ohne Login erreichbar (sonst könnte sich niemand anmelden).

import { Hono } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { addUser, findUserByName } from "../database.ts";
import { hashPassword, verifyPassword } from "../password.ts";
import { loginSchema, onInvalid, registerSchema } from "../schemas.ts";
import { endSession, getLoggedInUser, startSession } from "../session.ts";

export const authRoutes = new Hono();

// Neues WG-Konto anlegen und direkt anmelden
authRoutes.post("/register", zValidator("json", registerSchema, onInvalid), (c) => {
  const { username, password } = c.req.valid("json");

  if (findUserByName(username)) {
    throw new HTTPException(409, { message: "Benutzername ist schon vergeben" });
  }

  const user = addUser(username, hashPassword(password));
  startSession(c, user.id);
  return c.json(user, 201);
});

// Anmelden
authRoutes.post("/login", zValidator("json", loginSchema, onInvalid), (c) => {
  const { username, password } = c.req.valid("json");
  const user = findUserByName(username);

  // Gleiche Meldung für "Benutzer gibt es nicht" und "Passwort falsch".
  // So kann niemand herausfinden, welche Benutzernamen es gibt.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new HTTPException(401, { message: "Benutzername oder Passwort falsch" });
  }

  startSession(c, user.id);
  return c.json({ id: user.id, username: user.username }); // ohne passwordHash!
});

// Abmelden: Session löschen und Cookie entfernen
authRoutes.post("/logout", (c) => {
  endSession(c);
  return c.body(null, 204);
});

// Wer ist gerade angemeldet? Das Frontend fragt das beim Laden der Seite.
authRoutes.get("/me", (c) => {
  const user = getLoggedInUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Nicht angemeldet" });
  }
  return c.json(user);
});
