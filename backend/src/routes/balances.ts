import { Hono } from "@hono/hono";
import type { BalanceService } from "../services/balance_service.ts";

export function balanceRoutes(service: BalanceService) {
  return new Hono().get("/", async (c) => c.json(await service.overview()));
}
