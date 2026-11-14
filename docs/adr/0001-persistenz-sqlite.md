# ADR 0001: SQLite über `node:sqlite` statt Deno KV

**Status:** angenommen

## Kontext
Die Daten müssen dauerhaft gespeichert werden. Im Kurs wurde Deno KV gezeigt.
Das Datenmodell hat Beziehungen: Eine Ausgabe gehört zu einem Zahler und zu mehreren
Beteiligten (n:m). Ein Mitglied darf nicht gelöscht werden, solange es irgendwo vorkommt.

## Entscheidung
SQLite über das in Deno eingebaute Modul `node:sqlite` (ab Deno 2.2).

## Begründung
- **Beziehungen passen zu SQL:** Fremdschlüssel, `ON DELETE CASCADE` und eine Tabelle
  `expense_participants` bilden das Modell direkt ab.
- **Datenbank sichert mit ab:** `CHECK (amount_cents > 0)`, `UNIQUE` für Namen,
  Fremdschlüssel. Fehler im Code führen so nicht zu kaputten Daten.
- **Transaktionen:** Ausgabe und Beteiligte werden gemeinsam oder gar nicht gespeichert.
- **Keine Zusatzbibliothek:** `node:sqlite` ist in Deno eingebaut.
- **Kein Unstable-Flag:** Deno KV braucht (Stand Deno 2.9.8) `--unstable-kv`, sonst gibt
  es `Deno.openKv` nicht. Getestet.

## Verworfene Alternative: Deno KV
Vorteil: im Kurs gezeigt, kein SQL nötig. Nachteil: Key-Value-Speicher ohne Abfragen
und Fremdschlüssel. „Kommt Mitglied X in irgendeiner Ausgabe vor?“ müsste man in
TypeScript über alle Einträge prüfen oder mit zusätzlichen Index-Schlüsseln selbst pflegen.

## Konsequenzen
- Alles SQL steht in einer Datei (`src/database.ts`). Die Routen rufen nur deren Funktionen
  auf, z. B. `getMembers()`. Ein Wechsel zu Deno KV hieße: nur `database.ts` neu schreiben,
  mit denselben Funktionsnamen. Routen und Rechenlogik bleiben gleich.
- Die Datenbank ist eine einzelne Datei (`wg-kasse.db`), leicht zu sichern oder zurückzusetzen.
