# ADR 0002: Geldbeträge als ganze Cent

**Status:** angenommen

## Kontext
Ausgaben werden aufgeteilt und aufsummiert. Kommazahlen (`number` in JavaScript)
haben Rundungsfehler: `0.1 + 0.2` ergibt `0.30000000000000004`.

## Entscheidung
Alle Beträge sind ganze Cent (`amountCents: 1250` = 12,50 €). Das gilt für Datenbank,
API und Rechenlogik. Nur die Anzeige im Frontend rechnet in Euro um.

## Begründung
- Ganzzahlen rechnen exakt. Die Summe aller Salden ist garantiert 0.
- Beim Aufteilen ist klar, wer den Rest-Cent bekommt (die kleinste ID, siehe `splitAmount`).
  1000 Cent auf 3 Personen = 334 + 333 + 333.
- Zod lehnt Kommabeträge wie `12.5` ab, falsche Daten kommen gar nicht erst rein.

## Verworfene Alternativen
- **Euro als Kommazahl:** Rundungsfehler, siehe oben.
- **Dezimal-Bibliothek** (z. B. decimal.js): zusätzliche Abhängigkeit für ein Problem,
  das Ganzzahlen schon lösen.

## Konsequenzen
- Das Frontend wandelt Eingaben wie „12,50“ in Cent um (`parseEuroToCents`). Dabei wird
  über Text gerechnet, nicht über Kommazahlen.
- Wer die API direkt nutzt, muss Cent schicken. Das steht in der API-Doku.
