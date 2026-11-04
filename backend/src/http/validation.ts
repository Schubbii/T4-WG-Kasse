// Formale Validierung der Requests mit Zod.
// Fachliche Prüfungen (z. B. "existiert das Mitglied?") passieren im Service.

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ErrorBody } from "./errors.ts";

const id = z.number({ error: "Muss eine Zahl sein" }).int().positive();
const amountCents = z
  .number({ error: "Betrag muss eine Zahl sein" })
  .int({ error: "Betrag muss in ganzen Cent angegeben werden" })
  .positive({ error: "Betrag muss größer als 0 sein" })
  .max(10_000_000, { error: "Betrag ist zu groß (max. 100.000 €)" });
const date = z.iso.date({ error: "Datum muss im Format JJJJ-MM-TT sein" });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const memberSchema = z.object({
  name: z
    .string({ error: "Name fehlt" })
    .trim()
    .min(1, { error: "Name darf nicht leer sein" })
    .max(40, { error: "Name darf höchstens 40 Zeichen haben" }),
});

export const expenseSchema = z.object({
  description: z
    .string({ error: "Beschreibung fehlt" })
    .trim()
    .min(1, { error: "Beschreibung darf nicht leer sein" })
    .max(100, { error: "Beschreibung darf höchstens 100 Zeichen haben" }),
  amountCents,
  date,
  paidBy: id,
  participants: z
    .array(id, { error: "Beteiligte fehlen" })
    .min(1, { error: "Mindestens ein Beteiligter ist nötig" })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "Beteiligte dürfen nicht doppelt vorkommen",
    }),
});

export const settlementSchema = z
  .object({ fromId: id, toId: id, amountCents, date })
  .refine((s) => s.fromId !== s.toId, {
    error: "Zahler und Empfänger müssen verschieden sein",
    path: ["toId"],
  });

type Target = "json" | "param";

/**
 * Wrapper um zValidator, damit alle Validierungsfehler dasselbe Format haben:
 * 400 mit { error: { code: "VALIDATION_ERROR", message, details } }
 */
export function validate<T extends z.ZodType>(target: Target, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return c.json<ErrorBody>(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: details[0]?.message ?? "Ungültige Eingabe",
            details,
          },
        },
        400,
      );
    }
  });
}
