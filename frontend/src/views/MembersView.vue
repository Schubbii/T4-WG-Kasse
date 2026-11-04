<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
import ErrorMessage from '../components/ErrorMessage.vue'
import MemberList from '../components/MemberList.vue'
import { useMembers } from '../composables/useMembers'
import { useRequest } from '../composables/useRequest'
import type { Member } from '../types'

const { members, loadMembers } = useMembers()
const { error, busy, run } = useRequest()
const newName = ref('')

const load = () => run(loadMembers)

// Nach einer Änderung nur bei Erfolg neu laden. Sonst bliebe die Fehlermeldung nicht stehen.
async function add() {
  if (await run(() => api.members.create(newName.value.trim()))) {
    newName.value = ''
    await load()
  }
}

async function rename(id: number, name: string) {
  if (await run(() => api.members.rename(id, name))) await load()
}

async function remove(m: Member) {
  if (!confirm(`${m.name} löschen?`)) return
  // Das Backend lehnt ab (409), wenn das Mitglied noch in Ausgaben oder Zahlungen vorkommt.
  if (await run(() => api.members.remove(m.id))) await load()
}

onMounted(load)
</script>

<template>
  <ErrorMessage :message="error" />

  <form class="card inline-form" @submit.prevent="add">
    <input v-model="newName" required maxlength="40" placeholder="Name" aria-label="Name des neuen Mitglieds" />
    <button type="submit" :disabled="busy">Hinzufügen</button>
  </form>

  <section class="card">
    <h2>Mitglieder</h2>
    <MemberList :members="members" @rename="rename" @remove="remove" />
  </section>
</template>
