// Passwörter werden nie im Klartext gespeichert, sondern als Hash.
// Ein Hash lässt sich nicht zurückrechnen. Zum Prüfen wird das eingegebene
// Passwort erneut gehasht und mit dem gespeicherten Hash verglichen.
//
// Wir nutzen scrypt aus "node:crypto" (in Deno eingebaut). scrypt ist absichtlich
// langsam. Das macht es schwer, viele Passwörter durchzuprobieren.

import { Buffer } from "node:buffer";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Ergebnis: "salt:hash", beides als Hex-Text.
// Das Salt ist für jedes Passwort zufällig. Dadurch haben zwei gleiche
// Passwörter trotzdem unterschiedliche Hashes.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const storedHash = Buffer.from(hash, "hex");
  const newHash = scryptSync(password, salt, 64);
  // timingSafeEqual braucht immer gleich lange, egal wo sich die Hashes unterscheiden.
  // So kann man aus der Antwortzeit nichts ablesen.
  return timingSafeEqual(storedHash, newHash);
}
