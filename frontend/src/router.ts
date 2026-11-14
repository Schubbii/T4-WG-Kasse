// Welche Adresse zeigt welche Seite?

import { createRouter, createWebHistory } from 'vue-router'
import { getMe } from './api'
import { currentUser } from './auth'
import ExpensesView from './views/ExpensesView.vue'
import LoginView from './views/LoginView.vue'
import MembersView from './views/MembersView.vue'
import OverviewView from './views/OverviewView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: OverviewView },
    { path: '/ausgaben', component: ExpensesView },
    { path: '/mitglieder', component: MembersView },
  ],
})

// Läuft vor jedem Seitenwechsel: Ist jemand angemeldet?
// Wenn nicht, geht es zur Login-Seite.
// Das ist nur Komfort für die Oberfläche. Geschützt werden die Daten im Backend (401).
router.beforeEach(async (to) => {
  currentUser.value = await getMe()

  if (to.path === '/login') {
    // Wer schon angemeldet ist, braucht die Login-Seite nicht
    return currentUser.value ? '/' : true
  }
  if (!currentUser.value) {
    return '/login'
  }
  return true
})
