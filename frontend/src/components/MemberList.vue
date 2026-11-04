<script setup lang="ts">
import { ref } from 'vue'
import type { Member } from '../types'

defineProps<{ members: Member[] }>()

const emit = defineEmits<{
  rename: [id: number, name: string]
  remove: [member: Member]
}>()

// Welches Mitglied gerade umbenannt wird
const editingId = ref<number | null>(null)
const editName = ref('')

function startEdit(m: Member) {
  editingId.value = m.id
  editName.value = m.name
}

function saveEdit() {
  if (editingId.value !== null && editName.value.trim()) {
    emit('rename', editingId.value, editName.value.trim())
  }
  editingId.value = null
}
</script>

<template>
  <p v-if="members.length === 0" class="muted">Noch keine Mitglieder.</p>
  <ul v-else class="list">
    <li v-for="m in members" :key="m.id" class="row">
      <form v-if="editingId === m.id" class="inline-form" @submit.prevent="saveEdit">
        <input v-model="editName" maxlength="40" aria-label="Neuer Name" autofocus />
        <button type="submit">OK</button>
        <button type="button" class="secondary" @click="editingId = null">Abbrechen</button>
      </form>
      <template v-else>
        <strong>{{ m.name }}</strong>
        <span class="actions">
          <button type="button" class="icon" title="Umbenennen" @click="startEdit(m)">✎</button>
          <button type="button" class="icon danger" title="Löschen" @click="emit('remove', m)">✕</button>
        </span>
      </template>
    </li>
  </ul>
</template>
