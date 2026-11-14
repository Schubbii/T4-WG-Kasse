// Anmeldung über eine Session und ein Cookie.
//
// Ablauf:
// 1. Nach dem Login erzeugt der Server eine zufällige Session-ID und speichert sie
//    zusammen mit der userId in der Tabelle "sessions".
// 2. Der Server schickt die Session-ID als Cookie an den Browser.
// 3. Der Browser schickt das Cookie bei jeder Anfrage automatisch mit.
// 4. requireLogin liest das Cookie, sucht die Session und merkt sich die userId.

import type { Context, Next } from "@hono/hono";
import { deleteCookie, getCookie, setCookie } from "@hono/hono/cookie";
import { HTTPException } from "@hono/hono/http-exception";
import { addSession, deleteSession, getSession } from "./database.ts";
import type { User } from "./types.ts";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 Tage

// Damit Hono weiß, dass wir "userId" im Context speichern (c.set / c.get).
export type Env = { Variables: { userId: number } };

export function startSession(c: Context, userId: number) {
  const sessionId = crypto.randomUUID(); // zufällig, nicht zu erraten
  addSession(sessionId, userId);

  setCookie(c, COOKIE_NAME, sessionId, {
    httpOnly: true, // JavaScript im Browser kann das Cookie nicht lesen (Schutz vor XSS)
    sameSite: "Lax", // andere Websites können keine Anfragen mit diesem Cookie auslösen (CSRF)
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    // secure: true würde das Cookie nur über HTTPS senden. Lokal läuft die App über
    // http://localhost, deshalb ist es hier aus. Im echten Betrieb mit HTTPS einschalten.
  });
}

export function endSession(c: Context) {
  const sessionId = getCookie(c, COOKIE_NAME);
  if (sessionId) {
    deleteSession(sessionId);
  }
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

// Gibt den angemeldeten Benutzer zurück, oder undefined.
export function getLoggedInUser(c: Context): User | undefined {
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) return undefined;

  const session = getSession(sessionId);
  if (!session) return undefined;

  // Abgelaufene Session löschen
  const ageSeconds = (Date.now() - session.createdAt) / 1000;
  if (ageSeconds > MAX_AGE_SECONDS) {
    deleteSession(sessionId);
    return undefined;
  }
  return session.user;
}

// Middleware: läuft vor jeder geschützten Route.
// Ohne gültige Session gibt es 401, sonst wird die userId für die Route gespeichert.
export async function requireLogin(c: Context<Env>, next: Next) {
  const user = getLoggedInUser(c);
  if (!user) {
    throw new HTTPException(401, { message: "Nicht angemeldet" });
  }
  c.set("userId", user.id);
  await next();
}
