<!-- Liste aller Rückzahlungen -->
<script setup lang="ts">
import { formatDate, formatEuro, memberName } from '../format'
import type { Member, Settlement } from '../types'

defineProps<{
  settlements: Settlement[]
  members: Member[]
}>()

const emit = defineEmits<{ remove: [settlement: Settlement] }>()
</script>

<template>
  <p v-if="settlements.length === 0" class="muted">Noch keine Rückzahlungen.</p>

  <ul v-else class="list">
    <li v-for="s in settlements" :key="s.id" class="row">
      <div>
        {{ memberName(members, s.fromId) }} → {{ memberName(members, s.toId) }}
        <small class="muted">{{ formatDate(s.date) }}</small>
      </div>
      <span class="actions">
        <span class="amount">{{ formatEuro(s.amountCents) }}</span>
        <button type="button" class="icon danger" title="Löschen" @click="emit('remove', s)">✕</button>
      </span>
    </li>
  </ul>
</template>
