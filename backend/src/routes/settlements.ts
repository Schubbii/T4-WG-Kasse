import { Hono } from "@hono/hono";
import { idParamSchema, settlementSchema, validate } from "../http/validation.ts";
import type { SettlementService } from "../services/settlement_service.ts";

export function settlementRoutes(service: SettlementService) {
  return new Hono()
    .get("/", async (c) => c.json(await service.list()))
    .post("/", validate("json", settlementSchema), async (c) => {
      return c.json(await service.create(c.req.valid("json")), 201);
    })
    .delete("/:id", validate("param", idParamSchema), async (c) => {
      await service.delete(c.req.valid("param").id);
      return c.body(null, 204);
    });
}
