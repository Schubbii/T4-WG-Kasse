<!-- Grundgerüst: Kopfzeile mit Navigation, darunter die aktuelle Seite -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { logout } from './api'
import { currentUser } from './auth'

const router = useRouter()

async function onLogout() {
  await logout() // Backend löscht Session und Cookie
  currentUser.value = null
  router.push('/login')
}
</script>

<template>
  <header class="app-header">
    <div class="header-row">
      <h1>WG-Kasse</h1>
      <!-- Nur anzeigen, wenn jemand angemeldet ist -->
      <span v-if="currentUser" class="user">
        {{ currentUser.username }}
        <button type="button" class="secondary small" @click="onLogout">Abmelden</button>
      </span>
    </div>
    <nav v-if="currentUser" class="tabs">
      <RouterLink to="/">Übersicht</RouterLink>
      <RouterLink to="/ausgaben">Ausgaben</RouterLink>
      <RouterLink to="/mitglieder">Mitglieder</RouterLink>
    </nav>
  </header>
  <main class="container">
    <!-- Hier zeigt der Router die passende Seite an -->
    <RouterView />
  </main>
</template>
