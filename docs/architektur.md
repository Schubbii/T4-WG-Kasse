# Architektur

## Überblick

```
Browser (Vue)                                Deno-Server (Hono)
─────────────                                ──────────────────
views/  (Seiten)                             routes/      prüfen, speichern, antworten
  │                                            │  session.ts   angemeldet? (Cookie → userId)
  │                                            │  schemas.ts   Format prüfen (Zod)
  ├→ components/  (Anzeige, Eingabe)           │  balance.ts   Salden berechnen
  │                                            ▼
  └→ api.ts  ── fetch /api/... (JSON) ──→    database.ts  SQL → SQLite-Datei
```

Frontend und Backend sind **entkoppelt**: Sie kennen sich nur über die REST-API ([api.md](api.md)).

## Backend

| Datei | Aufgabe |
|---|---|
| `main.ts` | Startet alles: Datenbank öffnen, Frontend ausliefern, Server auf Port 8000 |
| `src/app.ts` | Bindet die Routen unter `/api/...` ein. Zentrale Fehlerbehandlung. |
| `src/routes/*.ts` | Eine Datei pro Ressource. Jede Route: Eingabe prüfen → Datenbank-Funktion aufrufen → JSON zurückgeben |
| `src/routes/auth.ts` | Registrieren, Anmelden, Abmelden, „Wer bin ich?“ |
| `src/session.ts` | Session anlegen und löschen, Cookie setzen, Middleware `requireLogin` |
| `src/password.ts` | Passwort hashen (scrypt mit Salt) und prüfen |
| `src/schemas.ts` | Zod-Schemas: Wie sieht eine gültige Eingabe aus? |
| `src/database.ts` | Tabellen anlegen und alle SQL-Befehle. Sonst steht nirgends SQL. |
| `src/balance.ts` | Rechenlogik ohne Datenbank und HTTP: aufteilen, Salden, Ausgleich |
| `src/types.ts` | Datentypen (Member, Expense, Settlement, ...) |

**Zwei Arten von Prüfungen:**
1. **Format** (Zod in `schemas.ts`): Ist der Betrag eine ganze Zahl? Ist der Name nicht leer?
   Dafür braucht man keine Datenbank.
2. **Fachliche Regeln** (in den Routen): Gibt es das Mitglied? Ist der Name schon vergeben?
   Darf das Mitglied gelöscht werden? Dafür fragt die Route die Datenbank.

**Fehler:** Eine Route wirft `new HTTPException(status, { message })`. Die Fehlerbehandlung
in `app.ts` macht daraus immer dieselbe Antwort: `{ "error": "Meldung" }`.

## Frontend

| Teil | Aufgabe |
|---|---|
| `views/` | Eine Datei pro Seite. Lädt Daten über `api.ts` und reagiert auf Klicks in den Komponenten. |
| `components/` | Zeigen Daten an (über Props) und melden Klicks nach oben (über Events). Sprechen nie selbst mit dem Backend. |
| `api.ts` | Einzige Stelle mit `fetch`. Wirft bei einem Fehler die Meldung des Backends. |
| `format.ts` | Euro ↔ Cent, Datum anzeigen, Namen zu einer ID suchen |
| `router.ts` | Ordnet Adressen den Seiten zu. `beforeEach` leitet ohne Anmeldung zu `/login` um. |
| `auth.ts` | `currentUser`: das angemeldete Konto. Wird von Router, `App.vue` und Login-Seite geteilt. |

**Wo liegt der Zustand?** Die Daten gehören dem Backend. Jede Seite hält eine Kopie in eigenen
`ref()`s und lädt nach jeder Änderung neu. Einziger geteilter Zustand ist `currentUser` in `auth.ts`.

Das Frontend rechnet **keine** Salden aus. Es zeigt an, was `GET /api/balances` liefert.

## Datenfluss: „Was passiert, wenn ich auf Speichern klicke?“

Beispiel: neue Ausgabe „Einkauf, 30,00 €“.

1. **`ExpenseForm.vue`** – `submit()` rechnet „30,00“ in `3000` Cent um, prüft grob
   (Betrag gültig, mindestens eine Person) und sendet das Event `save` mit den Daten.
2. **`ExpensesView.vue`** – `save()` empfängt das Event und ruft `addExpense(data)` auf.
3. **`api.ts`** – schickt `POST /api/expenses` mit den Daten als JSON.
4. **Vite-Proxy** (nur in der Entwicklung) leitet die Anfrage an das Backend auf Port 8000 weiter.
5. **`routes/expenses.ts`** – `zValidator` prüft mit `expenseSchema` das Format. Bei Fehler: 400.
6. **`routes/expenses.ts`** – `checkExpense()` prüft, ob alle Mitglieder existieren. Sonst: 400.
7. **`database.ts`** – `addExpense()` speichert in einer **Transaktion** die Ausgabe in
   `expenses` und die Beteiligten in `expense_participants`.
8. Das Backend antwortet mit **201** und der gespeicherten Ausgabe (jetzt mit `id`).
9. **`ExpensesView.vue`** – leert das Formular (neuer `key`) und lädt die Liste neu.
   Bei einem Fehler zeigt die Seite die Meldung an, die Eingaben bleiben erhalten.

## Anmeldung und Datentrennung

**Anmelden:**
1. `LoginView.vue` schickt Benutzername und Passwort per `POST /api/auth/login`.
2. `routes/auth.ts` sucht das Konto und prüft das Passwort mit `verifyPassword()`.
   Falsch → **401** „Benutzername oder Passwort falsch“ (gleiche Meldung für beide Fälle).
3. `startSession()` erzeugt eine zufällige Session-ID (`crypto.randomUUID()`), speichert sie in
   der Tabelle `sessions` und schickt sie als Cookie (`Set-Cookie: session=…; HttpOnly; SameSite=Lax`).
4. Ab jetzt schickt der Browser das Cookie bei jeder Anfrage an `/api` automatisch mit.

**Jede weitere Anfrage:**
1. `requireLogin` (in `session.ts`) läuft vor jeder Route in `members`, `expenses`, `settlements`, `balances`.
2. Es liest das Cookie, sucht die Session in der Datenbank und prüft, ob sie jünger als 7 Tage ist.
   Keine gültige Session → **401**.
3. Sonst speichert es `userId` im Context (`c.set`). Die Route holt sie mit `c.get("userId")`.
4. Jede Datenbank-Funktion bekommt die `userId` und filtert mit `WHERE userId = ?`.
   Daten einer anderen WG werden dadurch nie gefunden → **404**.

**Passwörter** werden nie im Klartext gespeichert, sondern als `salt:hash` mit scrypt.
Das Salt ist für jedes Passwort zufällig.

**Der Login im Frontend ist nur Komfort.** `router.beforeEach` leitet ohne Anmeldung zur
Login-Seite. Geschützt werden die Daten aber im Backend: Wer die API direkt aufruft, bekommt
ohne Cookie trotzdem 401.

## „Was wäre, wenn das Vue-Frontend durch eine mobile App ersetzt wird?“

Am Backend ändert sich **nichts**. Die Rechenlogik und alle Prüfungen liegen im Backend.
Eine App ruft dieselben Endpunkte auf und bekommt dieselben Ergebnisse und Fehlermeldungen.
Auch die Anmeldung funktioniert: Eine App kann das Session-Cookie genauso speichern und mitschicken.

## Datenmodell (SQLite)

```
users (id, username, passwordHash) ◄── sessions (id, userId, createdAt)
   ▲
   │ userId (in members, expenses, settlements)
   │
members (id, userId, name)
   ▲  ▲  ▲
   │  │  └──────── settlements (id, userId, fromId, toId, amountCents, date)
   │  └── expense_participants (expenseId, memberId)   ← Zwischentabelle
   │                │
   └── expenses (id, userId, description, amountCents, date, paidBy)
```

- Ein Konto (`users`) steht für eine WG. Mitglieder, Ausgaben und Rückzahlungen gehören über
  `userId` zu genau einem Konto.

- Eine Ausgabe hat **mehrere** Beteiligte, ein Mitglied ist an **mehreren** Ausgaben beteiligt.
  Diese n:m-Beziehung braucht die Zwischentabelle `expense_participants`.
- Fremdschlüssel sind eingeschaltet (`PRAGMA foreign_keys = ON`). Wird eine Ausgabe gelöscht,
  löscht SQLite ihre Beteiligten automatisch mit (`ON DELETE CASCADE`).
- Die Datenbank prüft zusätzlich selbst: Betrag > 0 (`CHECK`), Benutzernamen eindeutig,
  Mitgliedsnamen eindeutig pro WG (`UNIQUE (userId, name)`).
