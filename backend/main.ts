// Startpunkt des Backends: Datenbank öffnen, Frontend ausliefern, Server starten.

import { serveStatic } from "@hono/hono/deno";
import { app } from "./src/app.ts";
import { openDatabase } from "./src/database.ts";

openDatabase("wg-kasse.db");

// Das gebaute Frontend (npm run build) liegt in ../frontend/dist.
// Alle Adressen, die keine Datei sind, bekommen index.html. So funktioniert
// der Vue Router auch, wenn man z. B. /ausgaben direkt im Browser aufruft.
app.use("/*", serveStatic({ root: "../frontend/dist" }));
app.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

Deno.serve({ port: 8000 }, app.fetch);
