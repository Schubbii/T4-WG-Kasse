<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Expense, ExpenseInput, Member } from '../types'
import { centsToInput, parseEuroToCents, today } from '../utils/format'

const props = defineProps<{
  members: Member[]
  /** Ausgabe zum Bearbeiten. Ohne Angabe wird eine neue Ausgabe angelegt. */
  expense?: Expense | null
  busy?: boolean
}>()

const emit = defineEmits<{
  save: [input: ExpenseInput]
  cancel: []
}>()

// Startwerte: beim Bearbeiten aus der Ausgabe, sonst Standardwerte.
// Der Elternteil setzt einen neuen :key, damit das Formular frisch startet.
const description = ref(props.expense?.description ?? '')
const amount = ref(props.expense ? centsToInput(props.expense.amountCents) : '')
const date = ref(props.expense?.date ?? today())
const paidBy = ref<number | null>(props.expense?.paidBy ?? props.members[0]?.id ?? null)
const participants = ref<number[]>(
  props.expense ? [...props.expense.participants] : props.members.map((m) => m.id),
)

const amountCents = computed(() => parseEuroToCents(amount.value))
const formError = ref<string | null>(null)

function submit() {
  // Schnelle Prüfung für direkte Rückmeldung. Die verbindliche Prüfung macht das Backend.
  if (amountCents.value === null || amountCents.value <= 0) {
    formError.value = 'Bitte einen gültigen Betrag eingeben, z. B. 12,50'
    return
  }
  if (paidBy.value === null) {
    formError.value = 'Bitte auswählen, wer bezahlt hat'
    return
  }
  if (participants.value.length === 0) {
    formError.value = 'Bitte mindestens eine Person auswählen'
    return
  }
  formError.value = null
  emit('save', {
    description: description.value.trim(),
    amountCents: amountCents.value,
    date: date.value,
    paidBy: paidBy.value,
    participants: [...participants.value],
  })
}
</script>

<template>
  <form class="card form" @submit.prevent="submit">
    <h2>{{ expense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe' }}</h2>

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
      <label v-for="m in members" :key="m.id" class="checkbox">
        <input v-model="participants" type="checkbox" :value="m.id" />
        {{ m.name }}
      </label>
    </fieldset>

    <p v-if="formError" class="error" role="alert">{{ formError }}</p>

    <div class="actions">
      <button type="submit" :disabled="busy">{{ expense ? 'Änderung speichern' : 'Speichern' }}</button>
      <button v-if="expense" type="button" class="secondary" @click="emit('cancel')">Abbrechen</button>
    </div>
  </form>
</template>
