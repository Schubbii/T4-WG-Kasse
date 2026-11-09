# ADR 0005: Mitglied löschen nur ohne Buchungen (409)

**Status:** angenommen

## Kontext
Ein Mitglied kann in Ausgaben (als Zahler oder Beteiligter) und in Rückzahlungen vorkommen.
Würde man es einfach löschen, würden sich die Salden der anderen nachträglich ändern
oder Daten würden auf ein nicht mehr existierendes Mitglied zeigen.

## Entscheidung
`DELETE /api/members/:id` antwortet mit **409**, solange das Mitglied
irgendwo vorkommt. Ein Mitglied ohne Buchungen (z. B. falsch angelegt) kann gelöscht werden.

## Begründung
- Einfach umzusetzen und zu erklären.
- Die Abrechnung bleibt nachvollziehbar, es verschwindet nichts unbemerkt.
- Die Route prüft das mit `isMemberUsed()`. Zusätzlich verhindern die
  Fremdschlüssel in SQLite ungültige Verweise.

## Verworfene Alternativen
- **Kaskadierend löschen** (alle Ausgaben des Mitglieds mitlöschen): verfälscht die
  Salden der anderen.
- **Soft Delete** (Mitglied als „ausgezogen“ markieren): realistischer für WGs, aber
  mehr Aufwand (Feld, Filter in allen Listen, Anzeige). Guter Kandidat für eine spätere Version.

## Konsequenzen
- Wer auszieht, bleibt in der Liste, bis alles abgerechnet ist und die Ausgaben gelöscht sind.
- Das Frontend zeigt die Meldung des Backends an.
