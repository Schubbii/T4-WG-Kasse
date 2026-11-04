// Testet die REST-API von außen, mit einer frischen In-Memory-Datenbank pro Test.

import { assertEquals } from "@std/assert";
import { createApp } from "../src/app.ts";
import { openDatabase } from "../src/db.ts";
import { createSqliteRepositories } from "../src/repositories/sqlite.ts";

function setup() {
  const app = createApp({ repos: createSqliteRepositories(openDatabase(":memory:")) });
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return { app, call };
}

async function withMembers(names: string[]) {
  const ctx = setup();
  const ids: number[] = [];
  for (const name of names) {
    ids.push((await ctx.call("POST", "/api/members", { name })).body.id);
  }
  return { ...ctx, ids };
}

const today = "2026-11-04";

Deno.test("Mitglied anlegen, umbenennen, löschen", async () => {
  const { call } = setup();
  const created = await call("POST", "/api/members", { name: "  Anna " });
  assertEquals(created.status, 201);
  assertEquals(created.body.name, "Anna");

  const renamed = await call("PATCH", `/api/members/${created.body.id}`, { name: "Anna B." });
  assertEquals(renamed.body, { id: created.body.id, name: "Anna B." });

  assertEquals((await call("DELETE", `/api/members/${created.body.id}`)).status, 204);
  assertEquals((await call("GET", "/api/members")).body, []);
});

Deno.test("Doppelter Name gibt 409", async () => {
  const { call } = await withMembers(["Anna"]);
  const res = await call("POST", "/api/members", { name: "anna" });
  assertEquals(res.status, 409);
  assertEquals(res.body.error.code, "NAME_TAKEN");
});

Deno.test("Ungültige Eingabe gibt 400 mit einheitlichem Fehlerformat", async () => {
  const { call } = setup();
  const res = await call("POST", "/api/members", { name: "" });
  assertEquals(res.status, 400);
  assertEquals(res.body.error.code, "VALIDATION_ERROR");
  assertEquals(res.body.error.details[0].path, "name");
});

Deno.test("Kaputtes JSON gibt 400", async () => {
  const { app } = setup();
  const res = await app.request("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ name: kaputt",
  });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error.code, "BAD_REQUEST");
});

Deno.test("Ausgabe: anlegen, lesen, ändern, löschen", async () => {
  const { call, ids: [anna, ben] } = await withMembers(["Anna", "Ben"]);
  const input = {
    description: "Einkauf",
    amountCents: 2000,
    date: today,
    paidBy: anna,
    participants: [anna, ben],
  };

  const created = await call("POST", "/api/expenses", input);
  assertEquals(created.status, 201);
  assertEquals(created.body, { id: created.body.id, ...input });

  const updated = await call("PUT", `/api/expenses/${created.body.id}`, {
    ...input,
    amountCents: 3000,
    participants: [ben],
  });
  assertEquals(updated.body.amountCents, 3000);
  assertEquals(updated.body.participants, [ben]);

  assertEquals((await call("GET", `/api/expenses/${created.body.id}`)).body, updated.body);
  assertEquals((await call("DELETE", `/api/expenses/${created.body.id}`)).status, 204);
  assertEquals((await call("GET", `/api/expenses/${created.body.id}`)).status, 404);
});

Deno.test("Ausgabe mit unbekanntem Mitglied gibt 422", async () => {
  const { call, ids: [anna] } = await withMembers(["Anna"]);
  const res = await call("POST", "/api/expenses", {
    description: "Pizza",
    amountCents: 1000,
    date: today,
    paidBy: anna,
    participants: [anna, 99],
  });
  assertEquals(res.status, 422);
  assertEquals(res.body.error.code, "UNKNOWN_MEMBER");
});

Deno.test("Ausgabe mit Kommabetrag oder doppelten Beteiligten gibt 400", async () => {
  const { call, ids: [anna] } = await withMembers(["Anna"]);
  const base = { description: "X", date: today, paidBy: anna };
  assertEquals(
    (await call("POST", "/api/expenses", { ...base, amountCents: 12.5, participants: [anna] }))
      .status,
    400,
  );
  assertEquals(
    (await call("POST", "/api/expenses", { ...base, amountCents: 100, participants: [anna, anna] }))
      .status,
    400,
  );
});

Deno.test("Mitglied in Ausgabe kann nicht gelöscht werden (409)", async () => {
  const { call, ids: [anna, ben] } = await withMembers(["Anna", "Ben"]);
  await call("POST", "/api/expenses", {
    description: "Brot",
    amountCents: 300,
    date: today,
    paidBy: anna,
    participants: [ben],
  });
  const res = await call("DELETE", `/api/members/${ben}`);
  assertEquals(res.status, 409);
  assertEquals(res.body.error.code, "MEMBER_IN_USE");
});

Deno.test("Salden und Ausgleich über die API", async () => {
  const { call, ids: [anna, ben, cem] } = await withMembers(["Anna", "Ben", "Cem"]);
  await call("POST", "/api/expenses", {
    description: "Einkauf",
    amountCents: 3000,
    date: today,
    paidBy: anna,
    participants: [anna, ben, cem],
  });

  let overview = (await call("GET", "/api/balances")).body;
  assertEquals(overview.suggestions, [
    { fromId: ben, toId: anna, amountCents: 1000 },
    { fromId: cem, toId: anna, amountCents: 1000 },
  ]);

  // Beide Vorschläge als Zahlung erfassen → alles ausgeglichen
  for (const s of overview.suggestions) {
    assertEquals((await call("POST", "/api/settlements", { ...s, date: today })).status, 201);
  }
  overview = (await call("GET", "/api/balances")).body;
  assertEquals(overview.suggestions, []);
  assertEquals(overview.balances.map((b: { balanceCents: number }) => b.balanceCents), [0, 0, 0]);
});

Deno.test("Zahlung an sich selbst gibt 400", async () => {
  const { call, ids: [anna] } = await withMembers(["Anna"]);
  const res = await call("POST", "/api/settlements", {
    fromId: anna,
    toId: anna,
    amountCents: 100,
    date: today,
  });
  assertEquals(res.status, 400);
});

Deno.test("Unbekannter Endpunkt gibt JSON-404", async () => {
  const { call } = setup();
  const res = await call("GET", "/api/gibtsnicht");
  assertEquals(res.status, 404);
  assertEquals(res.body.error.code, "NOT_FOUND");
});
