<!-- Zeigt, wer wem wie viel zahlen soll. Mit "Erledigt" wird die Zahlung gespeichert. -->
<script setup lang="ts">
import { formatEuro, memberName } from '../format'
import type { Member, Suggestion } from '../types'

defineProps<{
  suggestions: Suggestion[]
  members: Member[]
}>()

// Meldet der übergeordneten Seite: Dieser Vorschlag wurde bezahlt.
const emit = defineEmits<{ done: [suggestion: Suggestion] }>()
</script>

<template>
  <p v-if="suggestions.length === 0" class="muted">Alles ausgeglichen. 🎉</p>

  <ul v-else class="list">
    <li v-for="s in suggestions" :key="s.fromId + '-' + s.toId" class="row">
      <span>
        <strong>{{ memberName(members, s.fromId) }}</strong> zahlt
        <strong>{{ memberName(members, s.toId) }}</strong>
      </span>
      <span class="actions">
        <span class="amount">{{ formatEuro(s.amountCents) }}</span>
        <button type="button" class="secondary" @click="emit('done', s)">Erledigt</button>
      </span>
    </li>
  </ul>
</template>
