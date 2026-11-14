// Tests für die REST-API. Jeder Test startet mit einer leeren Datenbank im Arbeitsspeicher.

import { assertEquals, assertNotEquals } from "@std/assert";
import { app } from "../src/app.ts";
import { openDatabase } from "../src/database.ts";
import { hashPassword, verifyPassword } from "../src/password.ts";

// Schickt eine Anfrage an die App und gibt Status, JSON-Antwort und Cookie zurück.
// "cookie" ist das Session-Cookie eines angemeldeten Kontos (oder leer).
async function send(method: string, path: string, body?: object, cookie = "") {
  const response = await app.request(path, {
    method: method,
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  // "session=abc...; Path=/; HttpOnly" → nur "session=abc..." behalten
  const setCookie = response.headers.get("set-cookie") ?? "";
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
    cookie: setCookie.split(";")[0],
  };
}

// Legt ein WG-Konto an und gibt das Session-Cookie zurück.
async function register(username: string) {
  const result = await send("POST", "/api/auth/register", { username, password: "geheim123" });
  return result.cookie;
}

// ---------- Anmeldung ----------

Deno.test("Passwort wird gehasht und kann geprüft werden", () => {
  const stored = hashPassword("geheim123");
  assertNotEquals(stored, "geheim123");
  assertEquals(verifyPassword("geheim123", stored), true);
  assertEquals(verifyPassword("falsch", stored), false);
  // Gleiches Passwort, anderes Salt → anderer Hash
  assertNotEquals(hashPassword("geheim123"), stored);
});

Deno.test("Registrieren, abmelden, wieder anmelden", async () => {
  openDatabase(":memory:");

  const registered = await send("POST", "/api/auth/register", {
    username: "wg-lindenstrasse",
    password: "geheim123",
  });
  assertEquals(registered.status, 201);
  assertEquals(registered.data, { id: 1, username: "wg-lindenstrasse" });

  const me = await send("GET", "/api/auth/me", undefined, registered.cookie);
  assertEquals(me.data.username, "wg-lindenstrasse");

  await send("POST", "/api/auth/logout", undefined, registered.cookie);
  const afterLogout = await send("GET", "/api/auth/me", undefined, registered.cookie);
  assertEquals(afterLogout.status, 401);

  const login = await send("POST", "/api/auth/login", {
    username: "wg-lindenstrasse",
    password: "geheim123",
  });
  assertEquals(login.status, 200);
  assertEquals(login.data.passwordHash, undefined); // Hash wird nie zurückgegeben
});

Deno.test("Falsches Passwort gibt 401", async () => {
  openDatabase(":memory:");
  await register("wg-a");

  const result = await send("POST", "/api/auth/login", { username: "wg-a", password: "falsch!!" });
  assertEquals(result.status, 401);
  assertEquals(result.data, { error: "Benutzername oder Passwort falsch" });
});

Deno.test("Benutzername doppelt gibt 409, zu kurzes Passwort 400", async () => {
  openDatabase(":memory:");
  await register("wg-a");

  const twice = await send("POST", "/api/auth/register", {
    username: "WG-A",
    password: "geheim123",
  });
  assertEquals(twice.status, 409);

  const short = await send("POST", "/api/auth/register", { username: "wg-b", password: "123" });
  assertEquals(short.status, 400);
});

Deno.test("Ohne Anmeldung gibt es 401", async () => {
  openDatabase(":memory:");
  for (const path of ["/api/members", "/api/expenses", "/api/settlements", "/api/balances"]) {
    const result = await send("GET", path);
    assertEquals(result.status, 401);
  }
});

Deno.test("Datentrennung: WG B sieht und ändert keine Daten von WG A", async () => {
  openDatabase(":memory:");
  const wgA = await register("wg-a");
  const wgB = await register("wg-b");

  await send("POST", "/api/members", { name: "Anna" }, wgA);
  await send("POST", "/api/expenses", {
    description: "Einkauf",
    amountCents: 1000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  }, wgA);

  // B sieht leere Listen
  assertEquals((await send("GET", "/api/members", undefined, wgB)).data, []);
  assertEquals((await send("GET", "/api/expenses", undefined, wgB)).data, []);

  // B kann A's Daten nicht lesen, ändern oder löschen (404, als gäbe es sie nicht)
  assertEquals((await send("GET", "/api/expenses/1", undefined, wgB)).status, 404);
  assertEquals((await send("PATCH", "/api/members/1", { name: "Hack" }, wgB)).status, 404);
  assertEquals((await send("DELETE", "/api/expenses/1", undefined, wgB)).status, 404);

  // B kann A's Mitglied nicht in eigenen Ausgaben verwenden
  const foreign = await send("POST", "/api/expenses", {
    description: "Trick",
    amountCents: 100,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  }, wgB);
  assertEquals(foreign.status, 400);

  // Gleicher Mitgliedsname ist in einer anderen WG erlaubt
  assertEquals((await send("POST", "/api/members", { name: "Anna" }, wgB)).status, 201);
});

// ---------- Fachliche Funktionen (immer angemeldet) ----------

Deno.test("Mitglied anlegen, umbenennen und löschen", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");

  const created = await send("POST", "/api/members", { name: "Anna" }, wg);
  assertEquals(created.status, 201);
  assertEquals(created.data, { id: 1, name: "Anna" });

  const renamed = await send("PATCH", "/api/members/1", { name: "Anna B." }, wg);
  assertEquals(renamed.data, { id: 1, name: "Anna B." });

  const deleted = await send("DELETE", "/api/members/1", undefined, wg);
  assertEquals(deleted.status, 204);
});

Deno.test("Doppelter Name gibt 409", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);

  const result = await send("POST", "/api/members", { name: "anna" }, wg);
  assertEquals(result.status, 409);
});

Deno.test("Leerer Name gibt 400 mit Fehlermeldung", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");

  const result = await send("POST", "/api/members", { name: "" }, wg);
  assertEquals(result.status, 400);
  assertEquals(result.data, { error: "Name darf nicht leer sein" });
});

Deno.test("Ausgabe anlegen, ändern und löschen", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);
  await send("POST", "/api/members", { name: "Ben" }, wg);

  const expense = {
    description: "Einkauf",
    amountCents: 2000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 2],
  };
  const created = await send("POST", "/api/expenses", expense, wg);
  assertEquals(created.status, 201);
  assertEquals(created.data, { id: 1, ...expense });

  const changed = await send("PUT", "/api/expenses/1", { ...expense, amountCents: 3000 }, wg);
  assertEquals(changed.data.amountCents, 3000);

  const deleted = await send("DELETE", "/api/expenses/1", undefined, wg);
  assertEquals(deleted.status, 204);

  const notFound = await send("GET", "/api/expenses/1", undefined, wg);
  assertEquals(notFound.status, 404);
});

Deno.test("Ausgabe mit unbekanntem Mitglied gibt 400", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);

  const result = await send("POST", "/api/expenses", {
    description: "Pizza",
    amountCents: 1000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 99],
  }, wg);
  assertEquals(result.status, 400);
});

Deno.test("Betrag mit Komma (12.5 Cent) gibt 400", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);

  const result = await send("POST", "/api/expenses", {
    description: "Brot",
    amountCents: 12.5,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  }, wg);
  assertEquals(result.status, 400);
});

Deno.test("Mitglied mit Ausgaben kann nicht gelöscht werden (409)", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);
  await send("POST", "/api/expenses", {
    description: "Brot",
    amountCents: 300,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  }, wg);

  const result = await send("DELETE", "/api/members/1", undefined, wg);
  assertEquals(result.status, 409);
});

Deno.test("Salden und Ausgleich über die API", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);
  await send("POST", "/api/members", { name: "Ben" }, wg);
  await send("POST", "/api/expenses", {
    description: "Einkauf",
    amountCents: 2000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 2],
  }, wg);

  const before = await send("GET", "/api/balances", undefined, wg);
  assertEquals(before.data.suggestions, [{ fromId: 2, toId: 1, amountCents: 1000 }]);

  // Ben zahlt Anna 10 € zurück
  await send("POST", "/api/settlements", {
    fromId: 2,
    toId: 1,
    amountCents: 1000,
    date: "2026-11-09",
  }, wg);

  const after = await send("GET", "/api/balances", undefined, wg);
  assertEquals(after.data.suggestions, []);
});

Deno.test("Zahlung an sich selbst gibt 400", async () => {
  openDatabase(":memory:");
  const wg = await register("wg-a");
  await send("POST", "/api/members", { name: "Anna" }, wg);

  const result = await send("POST", "/api/settlements", {
    fromId: 1,
    toId: 1,
    amountCents: 100,
    date: "2026-11-09",
  }, wg);
  assertEquals(result.status, 400);
});
