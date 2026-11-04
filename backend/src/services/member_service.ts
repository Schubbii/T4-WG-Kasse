import { AppError, notFound } from "../http/errors.ts";
import type { MemberRepository } from "../repositories/types.ts";

export function createMemberService(members: MemberRepository) {
  async function ensureNameFree(name: string, ownId?: number) {
    const existing = await members.findByName(name);
    if (existing && existing.id !== ownId) {
      throw new AppError(
        409,
        "NAME_TAKEN",
        `Es gibt bereits ein Mitglied namens "${existing.name}"`,
      );
    }
  }

  return {
    list: () => members.list(),

    async create(name: string) {
      await ensureNameFree(name);
      return members.create(name);
    },

    async rename(id: number, name: string) {
      if (!(await members.get(id))) throw notFound("Mitglied");
      await ensureNameFree(name, id);
      return (await members.rename(id, name))!;
    },

    /**
     * Ein Mitglied, das in Ausgaben oder Zahlungen vorkommt, darf nicht gelöscht werden.
     * Sonst würden sich die Salden der anderen nachträglich ändern.
     * Siehe docs/adr/0005-mitglied-loeschen.md.
     */
    async delete(id: number) {
      if (!(await members.get(id))) throw notFound("Mitglied");
      if (await members.isReferenced(id)) {
        throw new AppError(
          409,
          "MEMBER_IN_USE",
          "Mitglied kommt in Ausgaben oder Zahlungen vor und kann nicht gelöscht werden",
        );
      }
      await members.delete(id);
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
