# WG-Kasse

Ausgaben-Tracker für Wohngemeinschaften. Mitbewohner erfassen gemeinsame Ausgaben,
die App berechnet, wer wem wie viel schuldet, und schlägt möglichst wenige
Überweisungen zum Ausgleich vor.

Prüfungsprojekt im Modul T4 „Entwicklung von Webanwendungen mit entkoppelter Architektur“.

## Funktionen

- WG-Konto anlegen, anmelden, abmelden. Jede WG sieht nur ihre eigenen Daten.
- Mitglieder anlegen, umbenennen, löschen
- Ausgaben anlegen, bearbeiten, löschen (gleichmäßig auf ausgewählte Mitglieder aufgeteilt)
- Salden pro Mitglied und Vorschläge „wer zahlt wem“
- Rückzahlungen erfassen („Erledigt“) und wieder löschen
- Daten bleiben in einer SQLite-Datenbank gespeichert

## Technik

| Teil | Technik |
|---|---|
| Frontend | Vue 3 (SFC, Composition API), TypeScript, Vite, Vue Router |
| Backend | Deno, Hono, Zod (über `@hono/zod-validator`) |
| Datenhaltung | SQLite über das eingebaute `node:sqlite` |
| Schnittstelle | REST mit JSON, dokumentiert in [docs/api.md](docs/api.md) |

## Voraussetzungen

- [Deno](https://deno.com) 2.2 oder neuer (getestet mit 2.9.8)
- [Node.js](https://nodejs.org) 20.19+ oder 22.12+ mit npm (für Vite)

## Starten

### Entwicklung (zwei Terminals)

Backend auf Port 8000:

```bash
cd backend && deno task dev
```

Frontend mit Hot Reload auf Port 5173. Vite leitet `/api` an das Backend weiter:

```bash
cd frontend && npm install && npm run dev
```

Dann <http://localhost:5173> öffnen und ein WG-Konto anlegen.

> **Hinweis:** Wenn du eine `backend/wg-kasse.db` aus einer älteren Version hast, lösche sie
> vor dem Start. Der Tabellenaufbau hat sich geändert (z. B. Spalte `userId`), und die Tabellen
> werden nur angelegt, wenn sie noch fehlen.

### Produktion (ein Server)

Frontend bauen, danach liefert das Backend die fertigen Dateien selbst aus:

```bash
cd frontend && npm install && npm run build
```

```bash
cd backend && deno task start
```

Dann <http://localhost:8000> öffnen.

### Tests

```bash
cd backend && deno task test
```

## Projektstruktur

```
backend/
  main.ts                 Start: Datenbank öffnen, Frontend ausliefern, Server starten
  src/app.ts              Hono-App: bindet die Routen ein, zentrale Fehlerbehandlung
  src/routes/             Eine Datei pro Ressource: prüfen, speichern, antworten
  src/session.ts          Anmeldung: Session, Cookie, requireLogin
  src/password.ts         Passwörter hashen und prüfen
  src/schemas.ts          Validierung mit Zod
  src/database.ts         SQLite: Tabellen und alle SQL-Befehle
  src/balance.ts          Rechenlogik: aufteilen, Salden, Ausgleich
  src/types.ts            Datentypen
  tests/                  Tests für Rechenlogik und API
frontend/
  src/api.ts              Alle Anfragen ans Backend (fetch)
  src/auth.ts             Wer ist angemeldet? (geteilter Zustand)
  src/views/              Seiten: Anmelden, Übersicht, Ausgaben, Mitglieder
  src/components/         Bausteine der Seiten (Formular, Listen)
  src/format.ts           Hilfsfunktionen für Euro und Datum
  src/router.ts           Welche Adresse zeigt welche Seite, Umleitung zum Login
docs/
  api.md                  REST-API
  architektur.md          Aufbau und Datenfluss
  adr/                    Architekturentscheidungen
  reflexion.md            Reflexion (Vorlage)
```
