// Tests für die REST-API. Jeder Test startet mit einer leeren Datenbank im Arbeitsspeicher.

import { assertEquals } from "@std/assert";
import { app } from "../src/app.ts";
import { openDatabase } from "../src/database.ts";

// Schickt eine Anfrage an die App und gibt Status und JSON-Antwort zurück.
async function send(method: string, path: string, body?: object) {
  const response = await app.request(path, {
    method: method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

Deno.test("Mitglied anlegen, umbenennen und löschen", async () => {
  openDatabase(":memory:");

  const created = await send("POST", "/api/members", { name: "Anna" });
  assertEquals(created.status, 201);
  assertEquals(created.data, { id: 1, name: "Anna" });

  const renamed = await send("PATCH", "/api/members/1", { name: "Anna B." });
  assertEquals(renamed.data, { id: 1, name: "Anna B." });

  const deleted = await send("DELETE", "/api/members/1");
  assertEquals(deleted.status, 204);
});

Deno.test("Doppelter Name gibt 409", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });

  const result = await send("POST", "/api/members", { name: "anna" });
  assertEquals(result.status, 409);
});

Deno.test("Leerer Name gibt 400 mit Fehlermeldung", async () => {
  openDatabase(":memory:");

  const result = await send("POST", "/api/members", { name: "" });
  assertEquals(result.status, 400);
  assertEquals(result.data, { error: "Name darf nicht leer sein" });
});

Deno.test("Ausgabe anlegen, ändern und löschen", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });
  await send("POST", "/api/members", { name: "Ben" });

  const expense = {
    description: "Einkauf",
    amountCents: 2000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 2],
  };
  const created = await send("POST", "/api/expenses", expense);
  assertEquals(created.status, 201);
  assertEquals(created.data, { id: 1, ...expense });

  const changed = await send("PUT", "/api/expenses/1", { ...expense, amountCents: 3000 });
  assertEquals(changed.data.amountCents, 3000);

  const deleted = await send("DELETE", "/api/expenses/1");
  assertEquals(deleted.status, 204);

  const notFound = await send("GET", "/api/expenses/1");
  assertEquals(notFound.status, 404);
});

Deno.test("Ausgabe mit unbekanntem Mitglied gibt 400", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });

  const result = await send("POST", "/api/expenses", {
    description: "Pizza",
    amountCents: 1000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 99],
  });
  assertEquals(result.status, 400);
});

Deno.test("Betrag mit Komma (12.5 Cent) gibt 400", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });

  const result = await send("POST", "/api/expenses", {
    description: "Brot",
    amountCents: 12.5,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  });
  assertEquals(result.status, 400);
});

Deno.test("Mitglied mit Ausgaben kann nicht gelöscht werden (409)", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });
  await send("POST", "/api/expenses", {
    description: "Brot",
    amountCents: 300,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1],
  });

  const result = await send("DELETE", "/api/members/1");
  assertEquals(result.status, 409);
});

Deno.test("Salden und Ausgleich über die API", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });
  await send("POST", "/api/members", { name: "Ben" });
  await send("POST", "/api/expenses", {
    description: "Einkauf",
    amountCents: 2000,
    date: "2026-11-09",
    paidBy: 1,
    participants: [1, 2],
  });

  const before = await send("GET", "/api/balances");
  assertEquals(before.data.suggestions, [{ fromId: 2, toId: 1, amountCents: 1000 }]);

  // Ben zahlt Anna 10 € zurück
  await send("POST", "/api/settlements", {
    fromId: 2,
    toId: 1,
    amountCents: 1000,
    date: "2026-11-09",
  });

  const after = await send("GET", "/api/balances");
  assertEquals(after.data.suggestions, []);
});

Deno.test("Zahlung an sich selbst gibt 400", async () => {
  openDatabase(":memory:");
  await send("POST", "/api/members", { name: "Anna" });

  const result = await send("POST", "/api/settlements", {
    fromId: 1,
    toId: 1,
    amountCents: 100,
    date: "2026-11-09",
  });
  assertEquals(result.status, 400);
});
