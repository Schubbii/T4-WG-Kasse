# ADR 0003: Salden im Backend berechnen statt speichern

**Status:** angenommen

## Kontext
Die App soll zeigen, wer wie viel gut hat oder schuldet und wer wem zahlen soll.
Man könnte Salden in der Datenbank speichern und bei jeder Änderung anpassen,
oder sie bei jeder Anfrage aus Ausgaben und Rückzahlungen berechnen.
Außerdem: Rechnet das Frontend oder das Backend?

## Entscheidung
Salden und Ausgleichsvorschläge werden bei jedem `GET /api/balances` im Backend
neu berechnet (`src/balance.ts`). Sie werden nicht gespeichert.

## Begründung
- **Immer korrekt:** Ausgaben bearbeiten oder löschen ändert die Salden automatisch.
  Gespeicherte Salden könnten auseinanderlaufen, wenn ein Update vergessen wird.
- **Eine Quelle der Wahrheit:** Nur Ausgaben und Rückzahlungen sind gespeichert.
- **Backend statt Frontend:** Die Regel „wie wird aufgeteilt, wer bekommt den Rest-Cent“
  ist Geschäftslogik. Läge sie im Frontend, müsste jede weitere Oberfläche (z. B. eine
  mobile App) sie nachbauen und könnte zu anderen Ergebnissen kommen.
- **Testbar:** Die Rechenfunktionen haben keine Abhängigkeiten (`tests/balance_test.ts`).

## Verworfene Alternativen
- **Salden speichern:** schneller bei sehr vielen Ausgaben, aber fehleranfällig.
  Bei einer WG mit wenigen hundert Ausgaben im Jahr ist Neuberechnen schnell genug.
- **Berechnung im Frontend:** siehe Begründung.

## Konsequenzen
- Jede Anfrage lädt alle Ausgaben. Bei sehr großen Datenmengen müsste man umbauen
  (z. B. Zeiträume oder Abrechnungsperioden).
- Der Ausgleich nutzt ein Greedy-Verfahren (größter Schuldner zahlt an größten Gläubiger).
  Es ergibt höchstens n − 1 Überweisungen, ist aber nicht in jedem Fall das absolute Minimum.
