import { Hono } from "@hono/hono";
import { idParamSchema, memberSchema, validate } from "../http/validation.ts";
import type { MemberService } from "../services/member_service.ts";

export function memberRoutes(service: MemberService) {
  return new Hono()
    .get("/", async (c) => c.json(await service.list()))
    .post("/", validate("json", memberSchema), async (c) => {
      const { name } = c.req.valid("json");
      return c.json(await service.create(name), 201);
    })
    .patch("/:id", validate("param", idParamSchema), validate("json", memberSchema), async (c) => {
      const { id } = c.req.valid("param");
      const { name } = c.req.valid("json");
      return c.json(await service.rename(id, name));
    })
    .delete("/:id", validate("param", idParamSchema), async (c) => {
      await service.delete(c.req.valid("param").id);
      return c.body(null, 204);
    });
}
