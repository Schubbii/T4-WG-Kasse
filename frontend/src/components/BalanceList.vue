<script setup lang="ts">
import type { MemberBalance } from '../types'
import { formatCents } from '../utils/format'

defineProps<{ balances: MemberBalance[] }>()
</script>

<template>
  <ul class="list">
    <li v-for="b in balances" :key="b.memberId" class="row">
      <div>
        <strong>{{ b.name }}</strong>
        <small class="muted">bezahlt {{ formatCents(b.paidCents) }} · Anteil {{ formatCents(b.shareCents) }}</small>
      </div>
      <span
        class="amount"
        :class="{ positive: b.balanceCents > 0, negative: b.balanceCents < 0 }"
      >
        {{ b.balanceCents > 0 ? '+' : '' }}{{ formatCents(b.balanceCents) }}
      </span>
    </li>
  </ul>
</template>
