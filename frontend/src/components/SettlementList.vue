<script setup lang="ts">
import type { Settlement } from '../types'
import { formatCents, formatDate } from '../utils/format'

defineProps<{
  settlements: Settlement[]
  nameOf: (id: number) => string
}>()

const emit = defineEmits<{ remove: [settlement: Settlement] }>()
</script>

<template>
  <p v-if="settlements.length === 0" class="muted">Noch keine Rückzahlungen.</p>
  <ul v-else class="list">
    <li v-for="s in settlements" :key="s.id" class="row">
      <div>
        {{ nameOf(s.fromId) }} → {{ nameOf(s.toId) }}
        <small class="muted">{{ formatDate(s.date) }}</small>
      </div>
      <span class="actions">
        <span class="amount">{{ formatCents(s.amountCents) }}</span>
        <button type="button" class="icon danger" title="Zahlung löschen" @click="emit('remove', s)">✕</button>
      </span>
    </li>
  </ul>
</template>
