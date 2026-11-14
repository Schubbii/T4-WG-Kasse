# REST-API

Basis-URL: `/api`. Alle Anfragen und Antworten sind JSON.
Alle Geldbeträge sind **ganze Cent** (`amountCents: 1250` = 12,50 €).
Datumsangaben im Format `YYYY-MM-DD`.

## Anmeldung

Jede WG hat ein eigenes Konto. Nach Registrieren oder Anmelden setzt der Server ein Cookie
`session` (`HttpOnly`, `SameSite=Lax`, 7 Tage gültig). Der Browser schickt es bei jeder Anfrage
automatisch mit.

| Methode | Pfad | Zweck | Erfolg |
|---|---|---|---|
| POST | `/auth/register` | Konto anlegen und anmelden | 201 |
| POST | `/auth/login` | Anmelden | 200 |
| POST | `/auth/logout` | Abmelden (Session und Cookie löschen) | 204 |
| GET | `/auth/me` | Angemeldetes Konto | 200 |

Eingabe für `register` und `login`: `{ "username": "wg-lindenstrasse", "password": "geheim123" }`.
Antwort: `{ "id": 1, "username": "wg-lindenstrasse" }` (nie das Passwort oder der Hash).
Beim Registrieren: Benutzername 3 bis 30 Zeichen, Passwort mindestens 8 Zeichen.

**Alle anderen Endpunkte brauchen eine Anmeldung**, sonst **401**. Sie liefern und ändern nur
Daten der angemeldeten WG. Eine ID aus einer anderen WG wird behandelt, als gäbe es sie nicht (**404**).

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
Namen müssen innerhalb einer WG eindeutig sein (Groß-/Kleinschreibung egal), sonst 409.

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
{ "error": "Betrag muss größer als 0 sein" }
```

| Status | Wann |
|---|---|
| 400 | Eingabe ist ungültig: falsches Format (prüft Zod), kein gültiges JSON, Mitglied existiert nicht, Person doppelt ausgewählt, Zahlung an sich selbst |
| 401 | Nicht angemeldet, oder Benutzername/Passwort falsch |
| 404 | Ressource oder Endpunkt existiert nicht (auch: gehört zu einer anderen WG) |
| 409 | Konflikt: Benutzer- oder Mitgliedsname schon vergeben, oder Mitglied kommt in Ausgaben/Rückzahlungen vor und kann nicht gelöscht werden |
| 500 | Unerwarteter Serverfehler |

## Beispiele mit curl

`-c` speichert das Session-Cookie in einer Datei, `-b` schickt es wieder mit.

```bash
curl -c cookies.txt -X POST localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"wg-test","password":"geheim123"}'
```

```bash
curl -b cookies.txt -X POST localhost:8000/api/members -H 'Content-Type: application/json' -d '{"name":"Anna"}'
```

```bash
curl -b cookies.txt -X POST localhost:8000/api/expenses -H 'Content-Type: application/json' \
  -d '{"description":"Einkauf","amountCents":3000,"date":"2026-11-04","paidBy":1,"participants":[1]}'
```

```bash
curl -b cookies.txt localhost:8000/api/balances
```
