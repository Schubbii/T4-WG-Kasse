<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/client'
import BalanceList from '../components/BalanceList.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import SettlementList from '../components/SettlementList.vue'
import SettlementSuggestions from '../components/SettlementSuggestions.vue'
import { useMembers } from '../composables/useMembers'
import { useRequest } from '../composables/useRequest'
import type { BalanceOverview, Settlement, SettlementSuggestion } from '../types'
import { formatCents, today } from '../utils/format'

const { members, loadMembers, nameOf } = useMembers()
const { error, busy, run } = useRequest()

const overview = ref<BalanceOverview>({ balances: [], suggestions: [] })
const settlements = ref<Settlement[]>([])
const loaded = ref(false)

// Salden kommen fertig berechnet vom Backend. Das Frontend rechnet nichts selbst.
async function load() {
  await run(async () => {
    const [o, s] = await Promise.all([api.balances.get(), api.settlements.list(), loadMembers()])
    overview.value = o
    settlements.value = s
  })
  loaded.value = true
}

async function settle(s: SettlementSuggestion) {
  const ok = confirm(`${nameOf(s.fromId)} hat ${nameOf(s.toId)} ${formatCents(s.amountCents)} gezahlt?`)
  if (!ok) return
  if (await run(() => api.settlements.create({ ...s, date: today() }))) await load()
}

async function removeSettlement(s: Settlement) {
  if (!confirm('Diese Rückzahlung löschen?')) return
  if (await run(() => api.settlements.remove(s.id))) await load()
}

onMounted(load)
</script>

<template>
  <ErrorMessage :message="error" />

  <section v-if="loaded && members.length === 0" class="card">
    <h2>Willkommen!</h2>
    <p>Lege zuerst die Mitglieder deiner WG an.</p>
    <RouterLink to="/mitglieder" class="button">Mitglieder anlegen</RouterLink>
  </section>

  <template v-else-if="loaded">
    <section class="card">
      <h2>Salden</h2>
      <BalanceList :balances="overview.balances" />
    </section>

    <section class="card">
      <h2>Wer zahlt wem?</h2>
      <SettlementSuggestions
        :suggestions="overview.suggestions"
        :name-of="nameOf"
        :busy="busy"
        @settle="settle"
      />
    </section>

    <section class="card">
      <h2>Rückzahlungen</h2>
      <SettlementList :settlements="settlements" :name-of="nameOf" @remove="removeSettlement" />
    </section>
  </template>
</template>
