# ADR 0008: Bewusst einfacher Aufbau

**Status:** angenommen

## Kontext
Das Projekt ist klein (2 bis 3 Arbeitstage) und muss im Prüfungsgespräch vollständig
erklärt werden. Der Leitsatz des Moduls lautet „Klein. Vollständig. Entkoppelt. Begründbar.“
Eine erste Version hatte mehr Schichten: Routen, Services, Repository-Interfaces und
eine eigene Fehlerklasse.

## Entscheidung
Das Backend hat nur drei Arten von Dateien:
- **Routen** (`src/routes/`): prüfen, Datenbank-Funktion aufrufen, antworten
- **Datenbank** (`src/database.ts`): alle SQL-Befehle
- **Rechenlogik** (`src/balance.ts`): aufteilen, Salden, Ausgleich

Fehler werden mit Hono's eingebautem `HTTPException` gemeldet. Das Fehlerformat ist
`{ "error": "Meldung" }`.

Im Frontend lädt jede Seite ihre Daten selbst über `api.ts` und fängt Fehler mit
`try/catch` ab.

## Begründung
- Weniger Dateien und weniger Konzepte: Den Weg einer Anfrage kann man in drei Dateien verfolgen.
- Die wichtigen Trennungen bleiben erhalten: SQL nur in `database.ts`, Rechenlogik ohne
  Datenbank in `balance.ts`, Frontend und Backend nur über die REST-API verbunden.
- `HTTPException` gehört zu Hono, man braucht keine eigene Fehlerklasse.

## Verworfene Alternative: zusätzliche Service- und Repository-Schicht
Üblich in großen Projekten: Die Routen kennen nur Services, die Services nur
Repository-Interfaces. Vorteil: Teile sind austauschbar und einzeln testbar.
Nachteil hier: viele zusätzliche Dateien und Indirektionen für eine kleine App.

## Konsequenzen
- Die fachlichen Prüfungen (Mitglied existiert? Name frei?) stehen direkt in den Routen.
  Wächst die App, sollte man sie in eine eigene Schicht verschieben.
- Die Routen hängen direkt von `database.ts` ab. Ein Wechsel der Datenbank betrifft nur
  diese Datei, solange die Funktionsnamen gleich bleiben.
- Im Frontend wiederholt sich das `try/catch` in jeder Seite. Das ist etwas mehr Code,
  aber jede Seite ist für sich verständlich.
