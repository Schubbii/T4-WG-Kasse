<script setup lang="ts">
import type { SettlementSuggestion } from '../types'
import { formatCents } from '../utils/format'

defineProps<{
  suggestions: SettlementSuggestion[]
  nameOf: (id: number) => string
  busy?: boolean
}>()

const emit = defineEmits<{ settle: [suggestion: SettlementSuggestion] }>()
</script>

<template>
  <p v-if="suggestions.length === 0" class="muted">Alles ausgeglichen. 🎉</p>
  <ul v-else class="list">
    <li v-for="s in suggestions" :key="`${s.fromId}-${s.toId}`" class="row">
      <span>
        <strong>{{ nameOf(s.fromId) }}</strong> zahlt <strong>{{ nameOf(s.toId) }}</strong>
      </span>
      <span class="actions">
        <span class="amount">{{ formatCents(s.amountCents) }}</span>
        <button type="button" class="secondary" :disabled="busy" @click="emit('settle', s)">
          Erledigt
        </button>
      </span>
    </li>
  </ul>
</template>
