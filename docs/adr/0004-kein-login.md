# ADR 0004: Kein Login

**Status:** angenommen

## Kontext
Im Kurs wurden Login mit HTTP-only Cookies und Passwort-Hashing gezeigt.
Die Mindestanforderungen des Prüfungsprojekts verlangen keinen Login.
Laut Folie 28 ist „ein komplexes Login-System“ ausdrücklich nicht nötig.

## Entscheidung
Die App hat keinen Login. Alle, die die App erreichen, sehen und ändern dieselben Daten.

## Begründung
- Der Umfang (2 bis 3 Arbeitstage) geht in den fachlichen Kern: CRUD, Validierung,
  Geschäftslogik, Fehlerbehandlung.
- Gedachter Einsatz: eine WG im eigenen Netz, die sich gegenseitig vertraut.

## Verworfene Alternative
Login pro Mitglied (Cookie-Session, gehashte Passwörter). Sinnvoll, sobald die App
öffentlich im Internet läuft. Würde ein `users`-Konzept, Sessions und Rechte erfordern.

## Konsequenzen
- **Nicht öffentlich betreiben.** Jeder mit Zugriff kann Daten ändern oder löschen.
- Nachrüsten ist möglich, ohne die Fachlogik zu ändern: eine Hono-Middleware vor `/api`
  prüft die Session. Routes, Services und Repositories bleiben gleich.
