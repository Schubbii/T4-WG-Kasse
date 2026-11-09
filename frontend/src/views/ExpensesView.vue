<!-- Seite "Ausgaben": Formular oben, Liste darunter -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { addExpense, deleteExpense, getExpenses, getMembers, updateExpense } from '../api'
import ExpenseForm from '../components/ExpenseForm.vue'
import ExpenseList from '../components/ExpenseList.vue'
import type { Expense, Member } from '../types'

const members = ref<Member[]>([])
const expenses = ref<Expense[]>([])
const editing = ref<Expense | null>(null) // die Ausgabe, die gerade bearbeitet wird
const error = ref('')
const loaded = ref(false)

// Ändert sich der "key" einer Komponente, baut Vue sie neu auf.
// So wird das Formular nach dem Speichern wieder leer.
const formKey = ref(0)

async function load() {
  try {
    members.value = await getMembers()
    expenses.value = await getExpenses()
  } catch (e) {
    error.value = (e as Error).message
  }
  loaded.value = true
}

// Wird aufgerufen, wenn im Formular auf "Speichern" geklickt wird.
async function save(data: Omit<Expense, 'id'>) {
  try {
    if (editing.value) {
      await updateExpense(editing.value.id, data) // PUT /api/expenses/:id
    } else {
      await addExpense(data) // POST /api/expenses
    }
    error.value = ''
    editing.value = null
    formKey.value++ // Formular leeren
    await load() // Liste neu laden
  } catch (e) {
    // Fehler vom Backend anzeigen. Die Eingaben im Formular bleiben erhalten.
    error.value = (e as Error).message
  }
}

function startEdit(expense: Expense) {
  editing.value = expense
  formKey.value++ // Formular mit den Werten dieser Ausgabe neu aufbauen
  window.scrollTo(0, 0)
}

function cancelEdit() {
  editing.value = null
  formKey.value++
}

async function remove(expense: Expense) {
  if (!confirm('"' + expense.description + '" löschen?')) {
    return
  }
  try {
    await deleteExpense(expense.id)
    if (editing.value?.id === expense.id) {
      cancelEdit()
    }
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

onMounted(load)
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>

  <section v-if="loaded && members.length === 0" class="card">
    <p>Bevor du Ausgaben erfassen kannst, braucht die WG Mitglieder.</p>
    <RouterLink to="/mitglieder" class="button">Mitglieder anlegen</RouterLink>
  </section>

  <template v-else-if="loaded">
    <ExpenseForm
      :key="formKey"
      :members="members"
      :expense="editing"
      @save="save"
      @cancel="cancelEdit"
    />

    <section class="card">
      <h2>Alle Ausgaben</h2>
      <ExpenseList :expenses="expenses" :members="members" @edit="startEdit" @remove="remove" />
    </section>
  </template>
</template>
