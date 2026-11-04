import { createRouter, createWebHistory } from 'vue-router'
import ExpensesView from '../views/ExpensesView.vue'
import MembersView from '../views/MembersView.vue'
import OverviewView from '../views/OverviewView.vue'

// Drei Ansichten mit eigener URL. Siehe docs/adr/0006-vue-router-ohne-pinia.md.
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/ausgaben', name: 'expenses', component: ExpensesView },
    { path: '/mitglieder', name: 'members', component: MembersView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
