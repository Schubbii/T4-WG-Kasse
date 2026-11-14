<!-- Zeigt für jedes Mitglied den Saldo: grün = bekommt Geld, rot = schuldet Geld -->
<script setup lang="ts">
import { formatEuro } from '../format'
import type { Balance } from '../types'

defineProps<{ balances: Balance[] }>()
</script>

<template>
  <ul class="list">
    <li v-for="balance in balances" :key="balance.memberId" class="row">
      <div>
        <strong>{{ balance.name }}</strong>
        <small class="muted">
          bezahlt {{ formatEuro(balance.paidCents) }} · Anteil {{ formatEuro(balance.shareCents) }}
        </small>
      </div>
      <span v-if="balance.balanceCents > 0" class="amount positive">
        +{{ formatEuro(balance.balanceCents) }}
      </span>
      <span v-else-if="balance.balanceCents < 0" class="amount negative">
        {{ formatEuro(balance.balanceCents) }}
      </span>
      <span v-else class="amount">{{ formatEuro(0) }}</span>
    </li>
  </ul>
</template>
