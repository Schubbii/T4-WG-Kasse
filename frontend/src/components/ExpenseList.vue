<script setup lang="ts">
import type { Expense } from '../types'
import { formatCents, formatDate } from '../utils/format'

defineProps<{
  expenses: Expense[]
  nameOf: (id: number) => string
}>()

const emit = defineEmits<{
  edit: [expense: Expense]
  remove: [expense: Expense]
}>()
</script>

<template>
  <p v-if="expenses.length === 0" class="muted">Noch keine Ausgaben erfasst.</p>
  <ul v-else class="list">
    <li v-for="e in expenses" :key="e.id" class="row">
      <div>
        <strong>{{ e.description }}</strong>
        <small class="muted">
          {{ formatDate(e.date) }} · bezahlt von {{ nameOf(e.paidBy) }}<br />
          für {{ e.participants.map(nameOf).join(', ') }}
        </small>
      </div>
      <span class="actions">
        <span class="amount">{{ formatCents(e.amountCents) }}</span>
        <button type="button" class="icon" title="Bearbeiten" @click="emit('edit', e)">✎</button>
        <button type="button" class="icon danger" title="Löschen" @click="emit('remove', e)">✕</button>
      </span>
    </li>
  </ul>
</template>
