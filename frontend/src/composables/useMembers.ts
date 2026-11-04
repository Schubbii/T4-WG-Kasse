import { ref } from 'vue'
import { api } from '../api/client'
import type { Member } from '../types'

/** Mitgliederliste laden und Namen zu IDs nachschlagen. */
export function useMembers() {
  const members = ref<Member[]>([])

  async function loadMembers() {
    members.value = await api.members.list()
  }

  function nameOf(id: number): string {
    return members.value.find((m) => m.id === id)?.name ?? `#${id}`
  }

  return { members, loadMembers, nameOf }
}
