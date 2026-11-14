<!-- Startseite: Salden, Vorschläge "wer zahlt wem" und Rückzahlungen -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { addSettlement, deleteSettlement, getBalances, getMembers, getSettlements } from '../api'
import BalanceList from '../components/BalanceList.vue'
import SettlementList from '../components/SettlementList.vue'
import SettlementSuggestions from '../components/SettlementSuggestions.vue'
import { formatEuro, memberName, today } from '../format'
import type { Balance, Member, Settlement, Suggestion } from '../types'

const members = ref<Member[]>([])
const balances = ref<Balance[]>([])
const suggestions = ref<Suggestion[]>([])
const settlements = ref<Settlement[]>([])
const error = ref('')
const loaded = ref(false)

// Lädt alle Daten vom Backend. Die Salden rechnet das Backend aus, nicht das Frontend.
async function load() {
  try {
    members.value = await getMembers()
    const result = await getBalances()
    balances.value = result.balances
    suggestions.value = result.suggestions
    settlements.value = await getSettlements()
    error.value = ''
  } catch (e) {
    error.value = (e as Error).message
  }
  loaded.value = true
}

// "Erledigt" geklickt: Vorschlag als Rückzahlung speichern
async function markAsPaid(s: Suggestion) {
  const from = memberName(members.value, s.fromId)
  const to = memberName(members.value, s.toId)
  if (!confirm(from + ' hat ' + to + ' ' + formatEuro(s.amountCents) + ' gezahlt?')) {
    return
  }
  try {
    await addSettlement({ fromId: s.fromId, toId: s.toId, amountCents: s.amountCents, date: today() })
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function removeSettlement(s: Settlement) {
  if (!confirm('Diese Rückzahlung löschen?')) {
    return
  }
  try {
    await deleteSettlement(s.id)
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

// Beim Öffnen der Seite Daten laden
onMounted(load)
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>

  <!-- Noch keine Mitglieder: Hinweis anzeigen -->
  <section v-if="loaded && members.length === 0" class="card">
    <h2>Willkommen!</h2>
    <p>Lege zuerst die Mitglieder deiner WG an.</p>
    <RouterLink to="/mitglieder" class="button">Mitglieder anlegen</RouterLink>
  </section>

  <template v-else-if="loaded">
    <section class="card">
      <h2>Salden</h2>
      <BalanceList :balances="balances" />
    </section>

    <section class="card">
      <h2>Wer zahlt wem?</h2>
      <SettlementSuggestions :suggestions="suggestions" :members="members" @done="markAsPaid" />
    </section>

    <section class="card">
      <h2>Rückzahlungen</h2>
      <SettlementList :settlements="settlements" :members="members" @remove="removeSettlement" />
    </section>
  </template>
</template>
