// Baut die Hono-App zusammen: Repositories → Services → Routes.
// Die Abhängigkeiten werden von außen übergeben. So nutzen die Tests
// eine In-Memory-Datenbank und main.ts eine Datei.

import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";
import { logger } from "@hono/hono/logger";
import { handleError } from "./http/errors.ts";
import type { Repositories } from "./repositories/types.ts";
import { balanceRoutes } from "./routes/balances.ts";
import { expenseRoutes } from "./routes/expenses.ts";
import { memberRoutes } from "./routes/members.ts";
import { settlementRoutes } from "./routes/settlements.ts";
import { createBalanceService } from "./services/balance_service.ts";
import { createExpenseService } from "./services/expense_service.ts";
import { createMemberService } from "./services/member_service.ts";
import { createSettlementService } from "./services/settlement_service.ts";

export interface AppOptions {
  repos: Repositories;
  /** Ordner mit dem gebauten Frontend (vite build). Ohne Angabe nur die API. */
  staticDir?: string;
  /** Request-Log in der Konsole */
  log?: boolean;
}

export function createApp({ repos, staticDir, log = false }: AppOptions) {
  const app = new Hono();
  if (log) app.use(logger());

  const api = new Hono()
    .route("/members", memberRoutes(createMemberService(repos.members)))
    .route("/expenses", expenseRoutes(createExpenseService(repos.expenses, repos.members)))
    .route(
      "/settlements",
      settlementRoutes(createSettlementService(repos.settlements, repos.members)),
    )
    .route("/balances", balanceRoutes(createBalanceService(repos)));

  app.route("/api", api);

  // Unbekannte API-Pfade bekommen JSON statt der Frontend-Seite.
  app.all(
    "/api/*",
    (c) => c.json({ error: { code: "NOT_FOUND", message: "Endpunkt nicht gefunden" } }, 404),
  );

  if (staticDir) {
    // Frontend-Dateien ausliefern. Alle anderen Pfade bekommen index.html,
    // damit der Vue Router auch bei direktem Aufruf einer URL funktioniert.
    app.use("/*", serveStatic({ root: staticDir }));
    app.get("*", serveStatic({ path: `${staticDir}/index.html` }));
  }

  app.onError(handleError);
  return app;
}
