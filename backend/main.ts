// Einstiegspunkt: Datenbank öffnen, App bauen, Server starten.

import { createApp } from "./src/app.ts";
import { openDatabase } from "./src/db.ts";
import { createSqliteRepositories } from "./src/repositories/sqlite.ts";

const port = Number(Deno.env.get("PORT") ?? 8000);
const dbPath = Deno.env.get("DB_PATH") ?? "wg-kasse.db";
const staticDir = Deno.env.get("STATIC_DIR") ?? "../frontend/dist";

function dirExists(path: string): boolean {
  try {
    return Deno.statSync(path).isDirectory;
  } catch {
    return false;
  }
}

const db = openDatabase(dbPath);
const app = createApp({
  repos: createSqliteRepositories(db),
  staticDir: dirExists(staticDir) ? staticDir : undefined,
  log: true,
});

if (!dirExists(staticDir)) {
  console.log(`Kein Frontend-Build in ${staticDir} gefunden. Es läuft nur die API.`);
}

Deno.serve({ port }, app.fetch);
