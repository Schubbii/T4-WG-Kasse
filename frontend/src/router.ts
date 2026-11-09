// Welche Adresse zeigt welche Seite?

import { createRouter, createWebHistory } from 'vue-router'
import ExpensesView from './views/ExpensesView.vue'
import MembersView from './views/MembersView.vue'
import OverviewView from './views/OverviewView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: OverviewView },
    { path: '/ausgaben', component: ExpensesView },
    { path: '/mitglieder', component: MembersView },
  ],
})
