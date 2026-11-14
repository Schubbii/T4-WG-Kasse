<!-- Formular für eine neue Ausgabe oder zum Bearbeiten einer bestehenden -->
<script setup lang="ts">
import { ref } from 'vue'
import { centsToText, euroToCents, today } from '../format'
import type { Expense, Member } from '../types'

const props = defineProps<{
  members: Member[]
  expense: Expense | null // null = neue Ausgabe, sonst die Ausgabe zum Bearbeiten
}>()

const emit = defineEmits<{
  save: [data: Omit<Expense, 'id'>]
  cancel: []
}>()

// Die Eingabefelder. Beim Bearbeiten werden sie mit den alten Werten gefüllt.
const description = ref('')
const amount = ref('')
const date = ref(today())
const paidBy = ref(props.members[0]?.id)
const participants = ref(props.members.map((m) => m.id)) // standardmäßig alle

if (props.expense) {
  description.value = props.expense.description
  amount.value = centsToText(props.expense.amountCents)
  date.value = props.expense.date
  paidBy.value = props.expense.paidBy
  participants.value = [...props.expense.participants]
}

const formError = ref('')

function submit() {
  // Schnelle Prüfung im Browser. Die eigentliche Prüfung macht das Backend.
  const amountCents = euroToCents(amount.value)
  if (isNaN(amountCents) || amountCents <= 0) {
    formError.value = 'Bitte einen gültigen Betrag eingeben, z. B. 12,50'
    return
  }
  if (paidBy.value === undefined) {
    formError.value = 'Bitte auswählen, wer bezahlt hat'
    return
  }
  if (participants.value.length === 0) {
    formError.value = 'Bitte mindestens eine Person auswählen'
    return
  }

  formError.value = ''
  emit('save', {
    description: description.value,
    amountCents: amountCents,
    date: date.value,
    paidBy: paidBy.value,
    participants: participants.value,
  })
}
</script>

<template>
  <form class="card form" @submit.prevent="submit">
    <h2 v-if="expense">Ausgabe bearbeiten</h2>
    <h2 v-else>Neue Ausgabe</h2>

    <label>
      Wofür?
      <input v-model="description" required maxlength="100" placeholder="z. B. Wocheneinkauf" />
    </label>

    <div class="grid-2">
      <label>
        Betrag in €
        <input v-model="amount" required inputmode="decimal" placeholder="0,00" />
      </label>
      <label>
        Datum
        <input v-model="date" type="date" required />
      </label>
    </div>

    <label>
      Bezahlt von
      <select v-model="paidBy" required>
        <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </label>

    <fieldset>
      <legend>Aufgeteilt auf</legend>
      <!-- v-model mit einer Liste: angehakte IDs landen in "participants" -->
      <label v-for="m in members" :key="m.id" class="checkbox">
        <input v-model="participants" type="checkbox" :value="m.id" />
        {{ m.name }}
      </label>
    </fieldset>

    <p v-if="formError" class="error">{{ formError }}</p>

    <div class="actions">
      <button type="submit">Speichern</button>
      <button v-if="expense" type="button" class="secondary" @click="emit('cancel')">
        Abbrechen
      </button>
    </div>
  </form>
</template>
