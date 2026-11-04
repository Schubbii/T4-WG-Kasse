# ADR 0007: Zod über `npm:zod` statt `jsr:@zod/zod`

**Status:** angenommen

## Kontext
Die Validierung nutzt Zod mit `@hono/zod-validator`, wie im Kurs gezeigt.
Zod gibt es auf JSR (`jsr:@zod/zod`) und auf npm (`npm:zod`).
`@hono/zod-validator` (JSR, Version 0.9.1) hängt selbst von `npm:zod` ab.
Das wurde mit `deno add` geprüft und steht in `deno.lock`.

## Entscheidung
Das Backend importiert Zod als `npm:zod` (Eintrag `"zod"` in `deno.json`).

## Begründung
- Mit `jsr:@zod/zod` wären **zwei Zod-Kopien** geladen: unsere und die des Validators.
  Das ist unnötig und kann bei Typen zu Problemen führen.
- Mit `npm:zod` nutzen beide dieselbe Kopie.

## Verworfene Alternativen
- **`jsr:@zod/zod`:** zwei Kopien, siehe oben.
- **Eigene Validierung ohne Zod:** mehr Code, weniger klare Fehlermeldungen.
- **Hono-Validator ohne `@hono/zod-validator`:** möglich, aber mehr eigener Code für dasselbe.

## Konsequenzen
- Hinweis zu den Kursfolien: `jsr:@std/zod` gibt es nicht. Richtig ist `jsr:@zod/zod`
  oder, wie hier, `npm:zod`.
