# REST-API

Basis-URL: `/api`. Alle Anfragen und Antworten sind JSON.
Alle Geldbeträge sind **ganze Cent** (`amountCents: 1250` = 12,50 €).
Datumsangaben im Format `YYYY-MM-DD`.

## Übersicht

| Methode | Pfad | Zweck | Erfolg |
|---|---|---|---|
| GET | `/members` | Alle Mitglieder (nach Name sortiert) | 200 |
| POST | `/members` | Mitglied anlegen | 201 |
| PATCH | `/members/:id` | Mitglied umbenennen | 200 |
| DELETE | `/members/:id` | Mitglied löschen | 204 |
| GET | `/expenses` | Alle Ausgaben (neueste zuerst) | 200 |
| GET | `/expenses/:id` | Eine Ausgabe | 200 |
| POST | `/expenses` | Ausgabe anlegen | 201 |
| PUT | `/expenses/:id` | Ausgabe komplett ersetzen | 200 |
| DELETE | `/expenses/:id` | Ausgabe löschen | 204 |
| GET | `/settlements` | Alle Rückzahlungen | 200 |
| POST | `/settlements` | Rückzahlung erfassen | 201 |
| DELETE | `/settlements/:id` | Rückzahlung löschen | 204 |
| GET | `/balances` | Salden und Ausgleichsvorschläge (berechnet) | 200 |

**PATCH oder PUT?** Bei Mitgliedern ändert sich nur der Name, daher PATCH.
Das Ausgabe-Formular schickt immer alle Felder, daher PUT (vollständiges Ersetzen).

## Ressourcen

### Mitglied

```json
{ "id": 1, "name": "Anna" }
```

Eingabe (POST, PATCH): `{ "name": "Anna" }`. 1 bis 40 Zeichen, Leerzeichen am Rand werden entfernt.
Namen müssen eindeutig sein (Groß-/Kleinschreibung egal).

### Ausgabe

```json
{
  "id": 7,
  "description": "Wocheneinkauf",
  "amountCents": 3000,
  "date": "2026-11-04",
  "paidBy": 1,
  "participants": [1, 2, 3]
}
```

Eingabe (POST, PUT): dieselben Felder ohne `id`.

| Feld | Regel |
|---|---|
| `description` | 1 bis 100 Zeichen |
| `amountCents` | ganze Zahl, 1 bis 10.000.000 |
| `date` | gültiges Datum `YYYY-MM-DD` |
| `paidBy` | ID eines existierenden Mitglieds |
| `participants` | mindestens eine ID, keine doppelten, alle müssen existieren |

`paidBy` muss nicht in `participants` stehen (jemand kauft nur für andere ein).

### Rückzahlung

```json
{ "id": 3, "fromId": 2, "toId": 1, "amountCents": 1000, "date": "2026-11-04" }
```

Bedeutung: Mitglied `fromId` hat Mitglied `toId` den Betrag überwiesen.
`fromId` und `toId` müssen verschieden sein und existieren.

### Salden (`GET /balances`)

```json
{
  "balances": [
    { "memberId": 1, "name": "Anna", "paidCents": 3000, "shareCents": 1000, "balanceCents": 2000 },
    { "memberId": 2, "name": "Ben",  "paidCents": 0,    "shareCents": 1000, "balanceCents": -1000 },
    { "memberId": 3, "name": "Cem",  "paidCents": 0,    "shareCents": 1000, "balanceCents": -1000 }
  ],
  "suggestions": [
    { "fromId": 2, "toId": 1, "amountCents": 1000 },
    { "fromId": 3, "toId": 1, "amountCents": 1000 }
  ]
}
```

- `balanceCents > 0`: bekommt Geld zurück. `< 0`: schuldet Geld.
- `balanceCents` = bezahlt − Anteile + geleistete Rückzahlungen − erhaltene Rückzahlungen.
- Die Summe aller Salden ist immer 0.
- Rest-Cent beim Aufteilen (z. B. 10,00 € auf 3) bekommen die Beteiligten mit der kleinsten ID.

## Fehler

Alle Fehler haben dasselbe Format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Betrag muss größer als 0 sein",
    "details": [{ "path": "amountCents", "message": "Betrag muss größer als 0 sein" }]
  }
}
```

`details` gibt es nur bei Validierungsfehlern.

| Status | Code | Wann |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Eingabe hat das falsche Format (Zod) |
| 400 | `BAD_REQUEST` | Body ist kein gültiges JSON |
| 404 | `NOT_FOUND` | Ressource oder Endpunkt existiert nicht |
| 409 | `NAME_TAKEN` | Mitgliedsname ist schon vergeben |
| 409 | `MEMBER_IN_USE` | Mitglied kommt in Ausgaben/Rückzahlungen vor und kann nicht gelöscht werden |
| 422 | `UNKNOWN_MEMBER` | Format stimmt, aber ein angegebenes Mitglied existiert nicht |
| 500 | `INTERNAL_ERROR` | Unerwarteter Serverfehler |

**400 oder 422?** 400 heißt „die Anfrage ist formal falsch“ (prüft Zod ohne Datenbank).
422 heißt „formal richtig, aber fachlich nicht verarbeitbar“ (prüft der Service mit Datenbank).

## Beispiele mit curl

```bash
curl -X POST localhost:8000/api/members -H 'Content-Type: application/json' -d '{"name":"Anna"}'
```

```bash
curl -X POST localhost:8000/api/expenses -H 'Content-Type: application/json' \
  -d '{"description":"Einkauf","amountCents":3000,"date":"2026-11-04","paidBy":1,"participants":[1,2,3]}'
```

```bash
curl localhost:8000/api/balances
```
