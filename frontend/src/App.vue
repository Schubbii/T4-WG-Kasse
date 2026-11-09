<!-- Grundgerüst: Kopfzeile mit Navigation, darunter die aktuelle Seite -->
<template>
  <header class="app-header">
    <h1>WG-Kasse</h1>
    <nav class="tabs">
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
