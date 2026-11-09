# ADR 0006: Vue Router ja, Pinia nein

**Status:** angenommen

## Kontext
Das Frontend hat drei Ansichten. Zusätzliche Bibliotheken müssen begründet werden.
Zur Wahl stehen Vue Router für die Navigation und Pinia als zentraler Zustandsspeicher.

## Entscheidung
- **Vue Router:** ja.
- **Pinia:** nein. Jede Seite lädt ihre Daten selbst über `api.ts`.

## Begründung
**Vue Router**
- Jede Ansicht hat eine eigene URL (`/ausgaben`, `/mitglieder`). Man kann sie als
  Lesezeichen speichern, und der Zurück-Button des Browsers funktioniert.
- Offizielle Vue-Bibliothek, klein, bekannt.
- Alternative: Ansichten über eine Variable umschalten (`v-if`). Spart die Abhängigkeit,
  aber ohne URLs und Browser-Verlauf.

**Kein Pinia**
- Die Daten gehören dem Backend. Das Frontend hält nur eine Kopie für die Anzeige
  und lädt nach jeder Änderung neu. Ein zentraler Store würde eine zweite Wahrheit
  einführen, die man synchron halten muss.
- Pinia wäre eine weitere Bibliothek, die man lernen und erklären muss, ohne dass die App
  dadurch etwas Neues kann.

## Konsequenzen
- Beim Wechsel der Ansicht wird neu geladen. Bei einer kleinen WG-App sind das wenige
  kleine Anfragen.
- Das Backend liefert für unbekannte Pfade `index.html` aus, damit Direktaufrufe wie
  `/ausgaben` funktionieren (siehe `main.ts`).
