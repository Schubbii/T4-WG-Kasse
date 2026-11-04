<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/client'
import ErrorMessage from '../components/ErrorMessage.vue'
import ExpenseForm from '../components/ExpenseForm.vue'
import ExpenseList from '../components/ExpenseList.vue'
import { useMembers } from '../composables/useMembers'
import { useRequest } from '../composables/useRequest'
import type { Expense, ExpenseInput } from '../types'

const { members, loadMembers, nameOf } = useMembers()
const { error, busy, run } = useRequest()

const expenses = ref<Expense[]>([])
const editing = ref<Expense | null>(null)
const loaded = ref(false)
// Neuer Key → Formular wird neu aufgebaut und dadurch geleert.
const formKey = ref(0)

async function load() {
  await run(async () => {
    const [list] = await Promise.all([api.expenses.list(), loadMembers()])
    expenses.value = list
  })
  loaded.value = true
}

// Datenfluss "Speichern": Formular → save() → API-Client → POST/PUT /api/expenses → Liste neu laden
async function save(input: ExpenseInput) {
  const id = editing.value?.id
  const ok = await run(() =>
    id === undefined ? api.expenses.create(input) : api.expenses.update(id, input),
  )
  if (!ok) return // Fehler wird über ErrorMessage angezeigt, Eingaben bleiben erhalten
  editing.value = null
  formKey.value++
  await load()
}

function startEdit(e: Expense) {
  editing.value = e
  formKey.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  editing.value = null
  formKey.value++
}

async function remove(e: Expense) {
  if (!confirm(`„${e.description}“ löschen?`)) return
  if (!(await run(() => api.expenses.remove(e.id)))) return
  if (editing.value?.id === e.id) cancelEdit()
  await load()
}

onMounted(load)
</script>

<template>
  <ErrorMessage :message="error" />

  <section v-if="loaded && members.length === 0" class="card">
    <p>Bevor du Ausgaben erfassen kannst, braucht die WG Mitglieder.</p>
    <RouterLink to="/mitglieder" class="button">Mitglieder anlegen</RouterLink>
  </section>

  <template v-else-if="loaded">
    <ExpenseForm
      :key="formKey"
      :members="members"
      :expense="editing"
      :busy="busy"
      @save="save"
      @cancel="cancelEdit"
    />

    <section class="card">
      <h2>Alle Ausgaben</h2>
      <ExpenseList :expenses="expenses" :name-of="nameOf" @edit="startEdit" @remove="remove" />
    </section>
  </template>
</template>
