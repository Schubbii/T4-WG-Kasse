# ADR 0009: Login pro WG mit Session-Cookie

**Status:** angenommen (ersetzt [ADR 0004](0004-kein-login.md))

## Kontext
Das Briefing zum Prüfungsgespräch erwartet, dass Anmeldung, Session, Cookie und das Speichern
von Passwörtern erklärt werden können und dass die Daten verschiedener Benutzer getrennt sind.
Ohne Login konnte jeder, der die App erreicht, alle Daten sehen und ändern.

## Entscheidung
- **Ein Konto pro WG** (Tabelle `users`). Mitglieder, Ausgaben und Rückzahlungen bekommen eine
  Spalte `userId`. Jede Datenbank-Abfrage filtert mit `WHERE userId = ?`.
- **Session im Backend, Session-ID im Cookie.** Nach dem Login wird eine zufällige ID
  (`crypto.randomUUID()`) in der Tabelle `sessions` gespeichert und als Cookie gesendet:
  `HttpOnly`, `SameSite=Lax`, 7 Tage gültig.
- **Passwort als Hash mit Salt** über `scrypt` aus `node:crypto` (in Deno eingebaut).
- Eine Middleware `requireLogin` schützt alle Routen außer `/api/auth/...`.

## Begründung
- **Konto pro WG statt pro Mitglied:** Eine WG teilt sich eine Kasse. Alle Mitbewohner sollen
  alles sehen. Das hält das Datenmodell klein (eine Entität mehr statt Rollen und Rechten).
- **Session statt Token im Browser-Speicher:** Ein `HttpOnly`-Cookie kann kein JavaScript lesen,
  auch kein eingeschleustes (XSS). Abmelden ist einfach: Session in der Datenbank löschen.
- **scrypt:** absichtlich langsam, dadurch schwer durchzuprobieren. In Deno eingebaut, keine
  Zusatzbibliothek. Das zufällige Salt sorgt dafür, dass gleiche Passwörter verschiedene Hashes haben.
- **Gleiche Fehlermeldung** bei unbekanntem Benutzer und falschem Passwort: Niemand kann so
  herausfinden, welche Benutzernamen es gibt.
- **404 statt 403** bei fremden Daten: Die API verrät nicht, dass es die ID in einer anderen WG gibt.

## Verworfene Alternativen
- **Login pro Mitglied:** realistischer (wer hat was eingetragen?), braucht aber Rechte und eine
  Zuordnung Konto ↔ Mitglied. Zu viel für den Umfang.
- **JWT im `localStorage`:** Der Server muss nichts speichern, aber JavaScript kann das Token lesen
  (XSS-Risiko), und Abmelden vor Ablauf ist schwierig.
- **HTTP Basic Auth:** sehr einfach, aber das Passwort wird bei jeder Anfrage mitgeschickt, und es
  gibt kein richtiges Abmelden.
- **bcrypt aus einer Bibliothek:** genauso geeignet, aber eine zusätzliche Abhängigkeit.

## Konsequenzen
- `secure` ist beim Cookie aus, weil die App lokal über `http://localhost` läuft. Im echten Betrieb
  muss sie über HTTPS laufen und `secure: true` gesetzt werden.
- Kein Schutz gegen viele Login-Versuche hintereinander (Rate Limiting). Wäre für den echten Betrieb nötig.
- Abgelaufene Sessions werden erst gelöscht, wenn sie das nächste Mal benutzt werden.
- Der Tabellenaufbau hat sich geändert. Eine alte `wg-kasse.db` muss gelöscht werden.
