import { Hono } from "@hono/hono";
import { expenseSchema, idParamSchema, validate } from "../http/validation.ts";
import type { ExpenseService } from "../services/expense_service.ts";

export function expenseRoutes(service: ExpenseService) {
  return new Hono()
    .get("/", async (c) => c.json(await service.list()))
    .get("/:id", validate("param", idParamSchema), async (c) => {
      return c.json(await service.get(c.req.valid("param").id));
    })
    .post("/", validate("json", expenseSchema), async (c) => {
      return c.json(await service.create(c.req.valid("json")), 201);
    })
    // PUT, weil das Formular immer die komplette Ausgabe schickt.
    .put("/:id", validate("param", idParamSchema), validate("json", expenseSchema), async (c) => {
      return c.json(await service.update(c.req.valid("param").id, c.req.valid("json")));
    })
    .delete("/:id", validate("param", idParamSchema), async (c) => {
      await service.delete(c.req.valid("param").id);
      return c.body(null, 204);
    });
}
