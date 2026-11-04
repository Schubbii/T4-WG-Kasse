<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <h1>WG-Kasse</h1>
    <nav class="tabs" aria-label="Hauptnavigation">
      <RouterLink to="/">Übersicht</RouterLink>
      <RouterLink to="/ausgaben">Ausgaben</RouterLink>
      <RouterLink to="/mitglieder">Mitglieder</RouterLink>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>
