<!-- Seite "Anmelden": WG-Konto anmelden oder neu registrieren -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '../api'
import { currentUser } from '../auth'

const router = useRouter()

const username = ref('')
const password = ref('')
const isRegister = ref(false) // false = Anmelden, true = Registrieren
const error = ref('')

async function submit() {
  try {
    if (isRegister.value) {
      currentUser.value = await register(username.value, password.value)
    } else {
      currentUser.value = await login(username.value, password.value)
    }
    // Das Backend hat jetzt das Session-Cookie gesetzt.
    router.push('/')
  } catch (e) {
    error.value = (e as Error).message // z. B. "Benutzername oder Passwort falsch"
  }
}

function switchMode() {
  isRegister.value = !isRegister.value
  error.value = ''
}
</script>

<template>
  <form class="card form" @submit.prevent="submit">
    <h2 v-if="isRegister">WG-Konto anlegen</h2>
    <h2 v-else>Anmelden</h2>

    <label>
      Benutzername der WG
      <input v-model="username" required autocomplete="username" placeholder="z. B. wg-lindenstrasse" />
    </label>

    <label>
      Passwort
      <input
        v-model="password"
        type="password"
        required
        :autocomplete="isRegister ? 'new-password' : 'current-password'"
      />
    </label>
    <small v-if="isRegister" class="muted">Mindestens 8 Zeichen</small>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="actions">
      <button v-if="isRegister" type="submit">Konto anlegen</button>
      <button v-else type="submit">Anmelden</button>
      <button type="button" class="secondary" @click="switchMode">
        {{ isRegister ? 'Ich habe schon ein Konto' : 'Neues Konto anlegen' }}
      </button>
    </div>
  </form>
</template>
