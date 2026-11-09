// Validierung mit Zod: Hier steht, wie gültige Eingaben aussehen müssen.
// Ungültige Anfragen werden abgelehnt, bevor sie die Datenbank erreichen.

import type { Context } from "@hono/hono";
import { z } from "zod";

const memberId = z.number("ID muss eine Zahl sein").int().positive();

const amountCents = z
  .number("Betrag muss eine Zahl sein")
  .int("Betrag muss in ganzen Cent angegeben werden")
  .positive("Betrag muss größer als 0 sein")
  .max(10_000_000, "Betrag ist zu groß");

const date = z.iso.date("Datum muss im Format JJJJ-MM-TT sein");

export const memberSchema = z.object({
  name: z
    .string("Name fehlt")
    .trim()
    .min(1, "Name darf nicht leer sein")
    .max(40, "Name darf höchstens 40 Zeichen haben"),
});

export const expenseSchema = z.object({
  description: z
    .string("Beschreibung fehlt")
    .trim()
    .min(1, "Beschreibung darf nicht leer sein")
    .max(100, "Beschreibung darf höchstens 100 Zeichen haben"),
  amountCents: amountCents,
  date: date,
  paidBy: memberId,
  participants: z.array(memberId).min(1, "Mindestens eine Person muss beteiligt sein"),
});

export const settlementSchema = z.object({
  fromId: memberId,
  toId: memberId,
  amountCents: amountCents,
  date: date,
});

// Wird aufgerufen, wenn die Validierung fehlschlägt.
// Antwortet mit Status 400 und der ersten Fehlermeldung.
// "result" ist das Ergebnis von Zod. Wir brauchen daraus nur die Fehlermeldungen.
export function onInvalid(
  result: { success: boolean; error?: { issues: { message: string }[] } },
  c: Context,
) {
  if (!result.success) {
    const message = result.error?.issues[0].message ?? "Ungültige Eingabe";
    return c.json({ error: message }, 400);
  }
}
