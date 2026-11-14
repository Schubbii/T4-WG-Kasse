<!-- Seite "Mitglieder": anlegen, umbenennen, löschen -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { addMember, deleteMember, getMembers, renameMember } from '../api'
import MemberList from '../components/MemberList.vue'
import type { Member } from '../types'

const members = ref<Member[]>([])
const newName = ref('')
const error = ref('')

async function load() {
  try {
    members.value = await getMembers()
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function add() {
  try {
    await addMember(newName.value)
    newName.value = ''
    error.value = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message // z. B. "Es gibt schon ein Mitglied namens ..."
  }
}

async function rename(member: Member) {
  // prompt() öffnet ein einfaches Eingabefenster des Browsers
  const name = prompt('Neuer Name für ' + member.name, member.name)
  if (!name) {
    return // abgebrochen oder leer
  }
  try {
    await renameMember(member.id, name)
    error.value = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function remove(member: Member) {
  if (!confirm(member.name + ' löschen?')) {
    return
  }
  try {
    // Das Backend lehnt ab, wenn das Mitglied noch in Ausgaben vorkommt.
    await deleteMember(member.id)
    error.value = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

onMounted(load)
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>

  <form class="card inline-form" @submit.prevent="add">
    <input v-model="newName" required maxlength="40" placeholder="Name" />
    <button type="submit">Hinzufügen</button>
  </form>

  <section class="card">
    <h2>Mitglieder</h2>
    <MemberList :members="members" @rename="rename" @remove="remove" />
  </section>
</template>
