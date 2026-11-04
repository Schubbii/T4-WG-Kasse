import type { SettlementInput } from "../domain/types.ts";
import { AppError, notFound } from "../http/errors.ts";
import type { MemberRepository, SettlementRepository } from "../repositories/types.ts";

export function createSettlementService(
  settlements: SettlementRepository,
  members: MemberRepository,
) {
  return {
    list: () => settlements.list(),

    async create(input: SettlementInput) {
      for (const id of [input.fromId, input.toId]) {
        if (!(await members.get(id))) {
          throw new AppError(422, "UNKNOWN_MEMBER", `Mitglied mit ID ${id} existiert nicht`);
        }
      }
      return settlements.create(input);
    },

    async delete(id: number) {
      if (!(await settlements.delete(id))) throw notFound("Zahlung");
    },
  };
}

export type SettlementService = ReturnType<typeof createSettlementService>;
