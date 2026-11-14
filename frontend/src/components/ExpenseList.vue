<!-- Liste aller Ausgaben mit Knöpfen zum Bearbeiten und Löschen -->
<script setup lang="ts">
import { formatDate, formatEuro, memberName } from '../format'
import type { Expense, Member } from '../types'

const props = defineProps<{
  expenses: Expense[]
  members: Member[]
}>()

const emit = defineEmits<{
  edit: [expense: Expense]
  remove: [expense: Expense]
}>()

// "Anna, Ben, Cem"
function participantNames(expense: Expense): string {
  const names = expense.participants.map((id) => memberName(props.members, id))
  return names.join(', ')
}
</script>

<template>
  <p v-if="expenses.length === 0" class="muted">Noch keine Ausgaben.</p>

  <ul v-else class="list">
    <li v-for="expense in expenses" :key="expense.id" class="row">
      <div>
        <strong>{{ expense.description }}</strong>
        <small class="muted">
          {{ formatDate(expense.date) }} · bezahlt von {{ memberName(members, expense.paidBy) }}
        </small>
        <small class="muted">für {{ participantNames(expense) }}</small>
      </div>
      <span class="actions">
        <span class="amount">{{ formatEuro(expense.amountCents) }}</span>
        <button type="button" class="icon" title="Bearbeiten" @click="emit('edit', expense)">✎</button>
        <button type="button" class="icon danger" title="Löschen" @click="emit('remove', expense)">✕</button>
      </span>
    </li>
  </ul>
</template>
