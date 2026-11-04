# Architektur

## Überblick

```
┌──────────────── Browser ────────────────┐        ┌──────────────── Deno-Server ────────────────┐
│ Views  →  Components                     │        │ Routes (Hono)                                │
│   │                                      │  HTTP  │   │  Validierung (Zod) → 400                 │
│   └→ api/client.ts  ── fetch /api/... ───┼──JSON──┼→  ▼                                          │
│                                          │        │ Services  (Geschäftslogik, Fachregeln)       │
│                                          │        │   │  domain/balance.ts (reine Rechenlogik)   │
│                                          │        │   ▼                                          │
│                                          │        │ Repositories (Interface) → SQLite            │
└──────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

Frontend und Backend sind **entkoppelt**: Sie kennen sich nur über die REST-API ([api.md](api.md)).

## Backend-Schichten

| Schicht | Ordner | Aufgabe | Kennt |
|---|---|---|---|
| Routes | `src/routes/` | HTTP: Pfade, Statuscodes, JSON | Services, Validierung |
| Validierung | `src/http/validation.ts` | Format prüfen (Typ, Länge, Pflichtfelder) | Zod |
| Services | `src/services/` | Fachregeln (Mitglied existiert? Name frei? Darf gelöscht werden?) | Repository-Interfaces |
| Domain | `src/domain/` | Typen und reine Rechenlogik (Aufteilen, Salden, Ausgleich) | nichts |
| Repositories | `src/repositories/` | Speichern und Laden | SQLite |

Regel: Jede Schicht ruft nur die darunter auf. Die Rechenlogik in `domain/` hat
keine Abhängigkeiten und ist deshalb einfach testbar.

Fehler werden als `AppError` geworfen und zentral in `src/http/errors.ts` in das
einheitliche JSON-Fehlerformat übersetzt.

## Frontend-Aufbau

| Teil | Aufgabe |
|---|---|
| `views/` | Eine Datei pro Seite. Lädt Daten, reagiert auf Events der Komponenten. |
| `components/` | Anzeige und Eingabe. Bekommen Daten über Props, melden Aktionen über Events. Rufen nie selbst die API auf. |
| `api/client.ts` | Einzige Stelle mit `fetch`. Übersetzt Fehlerantworten in `ApiError`. |
| `composables/` | `useRequest`: Ladezustand und Fehlermeldung. `useMembers`: Mitglieder laden, Namen nachschlagen. |
| `utils/format.ts` | Euro ↔ Cent, Datumsformat |

Das Frontend rechnet **keine** Salden. Es zeigt an, was `GET /api/balances` liefert.

## Datenfluss: „Was passiert, wenn ich auf Speichern klicke?“

Beispiel: neue Ausgabe „Einkauf, 30,00 €“.

1. **`ExpenseForm.vue`**: `submit()` wandelt „30,00“ in `3000` Cent um, prüft grob
   (Betrag gültig, mindestens ein Beteiligter) und sendet das Event `save` mit den Daten.
2. **`ExpensesView.vue`**: `save()` ruft über `useRequest().run(...)` die Funktion
   `api.expenses.create(input)` auf.
3. **`api/client.ts`**: schickt `POST /api/expenses` mit JSON-Body.
4. **Vite-Proxy** (Entwicklung) leitet an `localhost:8000` weiter.
   In Produktion liefert das Backend das Frontend selbst aus, also gleicher Server.
5. **`routes/expenses.ts`**: Der Zod-Validator prüft das Format. Bei Fehler sofort 400.
6. **`services/expense_service.ts`**: prüft, ob Zahler und Beteiligte existieren. Sonst 422.
7. **`repositories/sqlite.ts`**: schreibt in einer **Transaktion** die Ausgabe in `expenses`
   und die Beteiligten in `expense_participants`.
8. Antwort **201** mit der gespeicherten Ausgabe inklusive `id`.
9. **`ExpensesView.vue`**: leert das Formular (neuer `key`) und lädt die Liste neu.
   Bei einem Fehler bleibt das Formular gefüllt und `ErrorMessage` zeigt die Meldung des Backends.

## „Was wäre, wenn das Vue-Frontend durch eine mobile App ersetzt wird?“

Am Backend ändert sich **nichts**. Die Geschäftslogik (Aufteilen, Salden, Ausgleich)
und alle Prüfungen liegen hinter der REST-API. Eine App ruft dieselben Endpunkte auf
und bekommt dieselben Ergebnisse und Fehlermeldungen.

Anpassen müsste man nur:
- **CORS**, falls die App aus einem anderen Ursprung zugreift (bei nativen Apps meist nicht nötig).
- **Login**, sobald die API öffentlich erreichbar ist (siehe [ADR 0004](adr/0004-kein-login.md)).

## Datenmodell (SQLite)

```
members (id, name UNIQUE)
   ▲  ▲  ▲
   │  │  └──────────────── settlements (id, from_member, to_member, amount_cents, date)
   │  └── expense_participants (expense_id, member_id)   ← n:m
   │                │
   └── expenses (id, description, amount_cents, date, paid_by)
```

- `expense_participants` bildet die n:m-Beziehung „Ausgabe ↔ beteiligte Mitglieder“ ab.
- Fremdschlüssel sind aktiv (`PRAGMA foreign_keys = ON`). Beim Löschen einer Ausgabe
  werden ihre Beteiligten automatisch mitgelöscht (`ON DELETE CASCADE`).
- `CHECK`-Regeln in der Datenbank (Betrag > 0, Zahler ≠ Empfänger) sichern die Daten
  zusätzlich zur Validierung ab.
