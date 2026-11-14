<!-- Liste der Mitglieder mit Knöpfen zum Umbenennen und Löschen -->
<script setup lang="ts">
import type { Member } from '../types'

defineProps<{ members: Member[] }>()

const emit = defineEmits<{
  rename: [member: Member]
  remove: [member: Member]
}>()
</script>

<template>
  <p v-if="members.length === 0" class="muted">Noch keine Mitglieder.</p>

  <ul v-else class="list">
    <li v-for="member in members" :key="member.id" class="row">
      <strong>{{ member.name }}</strong>
      <span class="actions">
        <button type="button" class="icon" title="Umbenennen" @click="emit('rename', member)">✎</button>
        <button type="button" class="icon danger" title="Löschen" @click="emit('remove', member)">✕</button>
      </span>
    </li>
  </ul>
</template>
